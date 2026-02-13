package com.example.demo.controller;

import java.util.List;
import java.util.Optional;

import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.demo.daos.CarDao;
import com.example.demo.entities.Car;
import com.example.demo.services.Carser;

/**
 * Updated controller:
 * - addCar wrapped with try/catch to return meaningful responses instead of raw 500s.
 * - deleteCar checks for existing bookings and returns 409 CONFLICT if any exist (prevents FK constraint failure).
 * - Business logic otherwise unchanged.
 */
@RestController
@RequestMapping("/getcars")
public class CarController {

    @Autowired
    private Carser carser;

    @Autowired
    private CarDao carDao;

    // BookingDao is used only to check if bookings reference a car before deleting.
    @Autowired
    private com.example.demo.daos.BookingDao bookingDao;

    /**
     * Add a car (admin only).
     * Returns 201 on success, or 400/500 with message on failure.
     */
    @PostMapping("/cars")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addCar(@Valid @RequestBody Car car) {
        try {
            Car saved = carser.addCar(car);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (DataIntegrityViolationException dive) {
            // likely DB constraint (missing required field, duplicate, etc.)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Failed to save car due to data integrity violation: " + dive.getRootCause().getMessage());
        } catch (Exception ex) {
            // generic fallback - return 500 with a friendly message
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to save car: " + ex.getMessage());
        }
    }

    @GetMapping("/getallcars")
    public List<Car> getAllCars() {
        return carser.getAllCars();
    }

    @GetMapping("/available")
    public ResponseEntity<List<Car>> getAvailableCars() {
        List<Car> available = carser.getAvailableCars();
        return ResponseEntity.ok(available);
    }

    @GetMapping("/get/{id}")
    public ResponseEntity<?> getCarById(@PathVariable long id) {
        Optional<Car> opt = carser.getCarById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("car not found");
        }
        return ResponseEntity.ok(opt.get());
    }

    @PutMapping("/edit/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateCar(@PathVariable long id, @Valid @RequestBody Car update) {
        Optional<Car> opt = carser.getCarById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Car not found");
        }
        Car existing = opt.get();
        existing.setBrand(update.getBrand());
        existing.setModel(update.getModel());
        existing.setYear(update.getYear());
        existing.setRegistrationNumber(update.getRegistrationNumber());
        existing.setRentPerDay(update.getRentPerDay());
        existing.setAvailable(update.isAvailable());
        // preserve other fields unchanged unless client provided them (business logic preserved)
        Car saved = carser.saveCar(existing);
        return ResponseEntity.ok(saved);
    }

    /**
     * Delete car (admin only). Before deleting we check whether bookings reference this car.
     * If bookings exist -> return 409 CONFLICT with helpful message (prevents FK errors).
     */
    @DeleteMapping("/deletecar/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCar(@PathVariable long id) {
        if (!carser.getCarById(id).isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Car not found");
        }

        try {
            long linkedBookings = bookingDao.countByCarId(id);
            if (linkedBookings > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("Cannot delete car: there are " + linkedBookings + " booking(s) referencing this car. Cancel or remove bookings first.");
            }

            // No linked bookings — safe to delete
            carser.deleteCar(id);
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            // Fallback: return server error
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete car: " + ex.getMessage());
        }
    }

    @GetMapping("/filter")
    public ResponseEntity<List<Car>> filterCars(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String carType,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        List<Car> cars = carDao.filterCars(location, carType, minPrice, maxPrice);
        return ResponseEntity.ok(cars);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Car>> searchCarsByBrand(@RequestParam String brand) {
        List<Car> cars = carDao.searchByBrand(brand);
        return ResponseEntity.ok(cars);
    }

    @GetMapping("/advanced-filter")
    public ResponseEntity<Page<Car>> advancedFilter(
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String carType,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) boolean available,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Car> cars = carDao.filterCars(brand, location, carType, minPrice, maxPrice, year, available, pageable);
        return ResponseEntity.ok(cars);
    }
}
