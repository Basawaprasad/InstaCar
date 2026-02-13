package com.example.demo.entities;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum BookingStatus {
    PENDING_PAYMENT,
    PENDING_APPROVAL,
    ACTIVE,
    COMPLETED,
    RETURNED,
    CANCELLED,
    REQUESTED, SUCCESS, REFUNDED, PENDING, FAILED, CONFIRMED;

    @JsonCreator
    public static BookingStatus fromString(String value) {
        if (value == null) return REQUESTED; // default
        try {
            return BookingStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return REQUESTED; // fallback if unknown string received
        }
    }
}
