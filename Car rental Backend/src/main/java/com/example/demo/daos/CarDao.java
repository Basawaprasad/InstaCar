package com.example.demo.daos;

import java.util.List;
// other imports...

import java.util.List;
import java.util.Optional;

import javax.validation.Valid;
import javax.validation.constraints.Min;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import com.example.demo.entities.Car;
import com.example.demo.repos.Carrepo;
import com.example.demo.services.Carser;

@Service
public class CarDao implements Carser {

    private final Carrepo carrepo;

    @Autowired
    public CarDao(Carrepo carrepo) {
        this.carrepo = carrepo;
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public Car addCar(@Valid Car car) {
        return carrepo.save(car);
    }

    @Override
    public List<Car> getAllCars() {
        return carrepo.findAll();
    }

    @Override
    public Optional<Car> getCarById(Long id) {
        return carrepo.findById(id);
    }

    @Override
    public List<Car> getAvailableCars() {
        return carrepo.findByAvailableTrue();
    }

    @Override
    public Car saveCar(Car existing) {
        return carrepo.save(existing);
    }

    @Override
    public void deleteCar(long id) {
        carrepo.deleteById(id);
    }

    @Override
    public List<Car> filterCars(String location, String carType, Double minPrice, Double maxPrice) {
        return carrepo.filterCars(location, carType, minPrice, maxPrice);
    }

    @Override
    public List<Car> searchByBrand(String brand) {
        return carrepo.findByBrandContainingIgnoreCase(brand);
    }

    @Override
    public Page<Car> filterCars(String brand, String location, String carType,
                                Double minPrice, Double maxPrice, Integer year, Boolean available, Pageable pageable) {
        // Fix default year value to null to allow optional year filtering
        int yearValue = (year != null) ? year : 0;

        // Use rentPerDay bounds; if null, assign sensible defaults
        double minPriceVal = (minPrice != null) ? minPrice : 0.0;
        double maxPriceVal = (maxPrice != null) ? maxPrice : Double.MAX_VALUE;

        // Handle available default value, true is a reasonable default
        boolean isAvailable = (available != null) ? available : true;

        // If year is 0, and this is invalid in your schema, consider changing repo method to accept Integer year
        // or call your dynamic filterCarsWithAvailability query instead

        return carrepo.findByBrandContainingIgnoreCaseAndLocationContainingIgnoreCaseAndCarTypeContainingIgnoreCaseAndRentPerDayBetweenAndYearAndAvailable(
                (brand != null) ? brand : "",
                (location != null) ? location : "",
                (carType != null) ? carType : "",
                minPriceVal,
                maxPriceVal,
                yearValue,
                isAvailable,
                pageable);
    }

    @Override
    public Page<Car> advancedFilter(String brand, String location, String carType, @Min(1900) Integer year, Boolean available, Pageable pageable) {
        // You can delegate here or implement advanced logic using Specifications or QueryDSL
        return filterCars(brand, location, carType, null, null, year, available, pageable);
    }

    @Override
    public List<Car> getAvailableCars(String location, String carType, Double minPrice, Double maxPrice) {
        // Implement this method or remove it if not needed

        // Example implementation calling the existing filterCars method and then filtering for availability
        List<Car> filteredCars = carrepo.filterCars(location, carType, minPrice, maxPrice);

        // Only return available cars
        return filteredCars.stream()
                .filter(Car::isAvailable)
                .toList();
    }
}
