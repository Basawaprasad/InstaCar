package com.example.demo.services;

import java.util.List;
import java.util.Optional;
import javax.validation.Valid;
import javax.validation.constraints.Min;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.example.demo.entities.Car;

public interface Carser {

    Car addCar(@Valid Car car);

    List<Car> getAllCars();

    Optional<Car> getCarById(Long id);

    List<Car> getAvailableCars();

    Car saveCar(Car existing);

    void deleteCar(long id);

    List<Car> filterCars(String location, String carType, Double minPrice, Double maxPrice);

    List<Car> searchByBrand(String brand);

    Page<Car> filterCars(String brand, String location, String carType, Double minPrice, Double maxPrice, Integer year,
                         Boolean available, Pageable pageable);

    Page<Car> advancedFilter(String brand, String location, String carType, @Min(1900) Integer year, Boolean available,
                             Pageable pageable);

    List<Car> getAvailableCars(String location, String carType, Double minPrice, Double maxPrice);
}
