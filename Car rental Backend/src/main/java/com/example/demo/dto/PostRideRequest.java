package com.example.demo.dto;

import java.time.LocalDateTime;

public class PostRideRequest {
    public Long carId;
    public Long ownerId; // owner (driver) id
    public String startLocation;
    public String endLocation;
    public LocalDateTime startTime;
    public LocalDateTime estimatedArrival;
    public Integer seatsTotal;
    public Double seatPrice;
    public String notes;
}
