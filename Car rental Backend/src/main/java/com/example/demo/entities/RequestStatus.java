package com.example.demo.entities;



import com.fasterxml.jackson.annotation.JsonCreator;

public enum RequestStatus {

    PENDING,     // Rider has requested a seat, waiting for owner to accept/reject
    ACCEPTED,    // Owner accepted; seat confirmed
    REJECTED,    // Owner rejected the request (refund should happen)
    CANCELLED,   // Rider cancelled before acceptance
    COMPLETED,   // Ride completed successfully
    NO_SHOW;     // Rider didn't show up (optional, for penalties)

    @JsonCreator
    public static RequestStatus fromString(String value) {
        if (value == null) return PENDING;
        try {
            return RequestStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return PENDING;
        }
    }
}
