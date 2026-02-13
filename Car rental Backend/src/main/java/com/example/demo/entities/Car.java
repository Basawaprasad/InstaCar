package com.example.demo.entities;

import javax.persistence.*;
import javax.validation.constraints.AssertTrue;
import javax.validation.constraints.DecimalMin;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Car {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id;

	@NotNull
	@Size(max = 50, message = "Brand name cannot exceed 50 characters")
	private String brand;

	@NotNull
	private String model;

	@NotNull
	private Integer year;

	@NotNull

	@Size(min = 6, max = 20, message = "Registration number must be 6-20 characters")
	@Pattern(regexp = "^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,12}$", message = "Invalid registration number format")
	@Column(name = "registration_number", nullable = false, length = 20, unique = true)
	private String registrationNumber;

	@NotNull
	private double rentPerDay;

	@NotNull
	@Column(name = "available", nullable = false)
	private boolean available; // Renamed from findAvailable to available

	@OneToOne(mappedBy = "rentedCar", fetch = FetchType.LAZY)
	@JsonBackReference
	private User currentUser;

	 @Size(max = 100, message = "Location name cannot exceed 100 characters")
	private String location; // e.g., "Hyderabad"
	 
	private String carType; // e.g., "SUV", "Sedan", "Hatchback"

	@NotNull
	@Size(max = 255, message = "Image URL too long")
	private String imageUrl;

	@NotNull
	@Column(name = "minprice", nullable = false)
	@DecimalMin(value = "0.0", inclusive = true, message = "Min price cannot be negative")
	private Double minPrice = 0.0;

	@NotNull
	@Column(name = "maxprice", nullable = false)
    @DecimalMin(value = "0.0", inclusive = true, message = "Max price cannot be negative")
	private Double maxPrice = 0.0;
	
    @AssertTrue(message = "Max price must be greater than or equal to min price")
    public boolean isPriceRangeValid() {
        if (minPrice == null || maxPrice == null) return true;
        return maxPrice >= minPrice;
    }

	// Default constructor
	public Car() {
	}

	// Parameterized constructor
	public Car(long id, String brand, String model, Integer year, String registrationNumber, double rentPerDay,
			boolean available, User currentUser) {
		this.id = id;
		this.brand = brand;
		this.model = model;
		this.year = year;
		this.registrationNumber = registrationNumber;
		this.rentPerDay = rentPerDay;
		this.available = available;
		this.currentUser = currentUser;
	}

	// Getters and Setters

	public long getId() {
		return id;
	}

	public void setId(long id) {
		this.id = id;
	}

	public String getBrand() {
		return brand;
	}

	public void setBrand(String brand) {
		this.brand = brand;
	}

	public String getModel() {
		return model;
	}

	public void setModel(String model) {
		this.model = model;
	}

	public Integer getYear() {
		return year;
	}

	public void setYear(Integer year) {
		this.year = year;
	}

	public String getRegistrationNumber() {
		return registrationNumber;
	}

	public void setRegistrationNumber(String registrationNumber) {
		this.registrationNumber = registrationNumber;
	}

	public double getRentPerDay() {
		return rentPerDay;
	}

	public void setRentPerDay(double rentPerDay) {
		this.rentPerDay = rentPerDay;
	}

	public boolean isAvailable() {
		return available;
	}

	public void setAvailable(boolean available) {
		this.available = available;
	}

	public User getCurrentUser() {
		return currentUser;
	}

	public void setCurrentUser(User currentUser) {
		this.currentUser = currentUser;
	}

	public String getLocation() {
		return location;
	}

	public void setLocation(String location) {
		this.location = location;
	}

	public String getCarType() {
		return carType;
	}

	public void setCarType(String carType) {
		this.carType = carType;
	}

	public String getImageUrl() {
		return imageUrl;
	}

	public void setImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}

	public Double getMinPrice() {
		return minPrice;
	}

	public void setMinPrice(Double minPrice) {
		this.minPrice = minPrice;
	}
	
	public Double getMaxPrice() {
		return maxPrice;
	}

	public void setMaxPrice(Double maxPrice) {
		this.maxPrice = maxPrice;
	}

	@Override
	public String toString() {
		return "Car [id=" + id + ", brand=" + brand + ", model=" + model + ", year=" + year + ", registrationNumber="
				+ registrationNumber + ", rentPerDay=" + rentPerDay + ", available=" + available + ", currentUser="
				+ currentUser + ", location=" + location + ", carType=" + carType + ", imageUrl=" + imageUrl + "]";
	}
}
