// src/main/java/com/example/demo/services/PaymentService.java
package com.example.demo.services;

import java.util.Map;

import com.example.demo.entities.Booking;

public interface PaymentService {
    /**
     * Verify payment payload from frontend/provider then confirm booking.
     * Returns the updated booking.
     *
     * paymentInfo map may contain:
     *  - paymentId (provider txn id)
     *  - provider  (e.g., "RAZORPAY")
     *  - signature (provider signature, optional)
     *  - status    (optional: "SUCCESS")
     */
    Booking verifyAndConfirmPayment(Long bookingId, Map<String, String> paymentInfo);
    
    
    
    /**
     * Process a refund for a booking (provider integration inside implementation).
     * @param bookingId booking id
     * @param amount amount to refund (INR)
     * @param reason free-text reason
     * @return true if refund initiated/succeeded, false otherwise
     * @throws Exception on provider errors
     */
    
    boolean processRefund(Long bookingId, double amount, String reason) throws Exception;
}
