package com.example.demo.entities;
import com.fasterxml.jackson.annotation.JsonCreator;

public enum OfferStatus {

    ACTIVE,          // Ride is open and visible to riders
    CANCELLED,       // Owner canceled before departure
    COMPLETED,       // Ride finished successfully
    EXPIRED,         // Departure time passed, ride not active
    FULLY_BOOKED;    // All seats taken, not accepting more requests

    @JsonCreator
    public static OfferStatus fromString(String value) {
        if (value == null) return ACTIVE;
        try {
            return OfferStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ACTIVE;
        }
    }
}
