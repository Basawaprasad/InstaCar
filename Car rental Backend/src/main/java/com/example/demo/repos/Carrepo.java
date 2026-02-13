package com.example.demo.repos;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.demo.entities.Car;

@Repository
public interface Carrepo extends JpaRepository<Car, Long>, JpaSpecificationExecutor<Car> {

    // ✅ Return all available cars
    List<Car> findByAvailableTrue();

    // ✅ Dynamic filtering (non-paginated) for available cars
    @Query("SELECT c FROM Car c WHERE " +
           "(:location IS NULL OR c.location = :location) AND " +
           "(:carType IS NULL OR c.carType = :carType) AND " +
           "(:minPrice IS NULL OR c.rentPerDay >= :minPrice) AND " +
           "(:maxPrice IS NULL OR c.rentPerDay <= :maxPrice) AND " +
           "c.available = true")
    List<Car> filterCars(
            @Param("location") String location,
            @Param("carType") String carType,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice
    );

    List<Car> findByBrandContainingIgnoreCase(String brand);

    // ✅ Paginated + advanced filter
    Page<Car> findByBrandContainingIgnoreCaseAndLocationContainingIgnoreCaseAndCarTypeContainingIgnoreCaseAndRentPerDayBetweenAndYearAndAvailable(
            String brand,
            String location,
            String carType,
            double minPrice,
            double maxPrice,
            int year,
            boolean available,
            Pageable pageable
    );

    // ✅ Dynamic filtering with optional availability
    @Query("SELECT c FROM Car c WHERE " +
           "(:brand IS NULL OR LOWER(c.brand) LIKE LOWER(CONCAT('%', :brand, '%'))) AND " +
           "(:location IS NULL OR LOWER(c.location) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
           "(:carType IS NULL OR c.carType = :carType) AND " +
           "(:minPrice IS NULL OR c.rentPerDay >= :minPrice) AND " +
           "(:maxPrice IS NULL OR c.rentPerDay <= :maxPrice) AND " +
           "(:year IS NULL OR c.year = :year) AND " +
           "(:available IS NULL OR c.available = :available)")
    List<Car> filterCarsWithAvailability(
            @Param("brand") String brand,
            @Param("location") String location,
            @Param("carType") String carType,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice,
            @Param("year") Integer year,
            @Param("available") Boolean available
    );
}
