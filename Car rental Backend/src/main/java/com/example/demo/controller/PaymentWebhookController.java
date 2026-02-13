package com.example.demo.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.entities.Booking;
import com.example.demo.services.Bookingser;

@RestController
@RequestMapping("/payment/webhook")
public class PaymentWebhookController {

    @Autowired
    private Bookingser bookingser;

    /**
     * Incoming webhook example shapes:
     * 1) { "bookingId": "123", "paymentId": "...", "provider": "RAZORPAY", "status": "SUCCESS", ... }
     *    -> existing behavior: confirmPayment(bookingId, payload)
     *
     * 2) Refund / payment events without bookingId but with paymentId/payment_id:
     *    { "payment_id": "...", "status": "processed", "amount": 50000, "event": "refund.processed" }
     *    -> correlate booking by paymentId and update refund status/amount
     *
     * This method preserves your original flow and *adds* handling for payment/refund events
     * that do not include bookingId.
     */
    @PostMapping
    public ResponseEntity<?> handleWebhook(@RequestBody Map<String, String> payload,
                                           @RequestHeader Map<String, String> headers) {
        try {
            // 1) If payload contains bookingId -> keep original behavior
            String bookingIdStr = payload.get("bookingId");
            if (bookingIdStr != null && !bookingIdStr.isBlank()) {
                Long bookingId = Long.valueOf(bookingIdStr);
                // Optional: validate provider signature using headers or payload (unchanged)
                bookingser.confirmPayment(bookingId, payload);
                return ResponseEntity.ok(Map.of("status", "ok"));
            }

            // 2) Try to handle provider events using payment id keys (common names)
            String paymentId = payload.getOrDefault("paymentId",
                                payload.getOrDefault("payment_id",
                                    payload.getOrDefault("razorpay_payment_id", null)));

            if (paymentId != null && !paymentId.isBlank()) {
                Optional<Booking> opt = bookingser.getBookingByPaymentId(paymentId);
                if (opt.isPresent()) {
                    Booking booking = opt.get();

                    // Normalize status/event values
                    String status = payload.getOrDefault("status", "").trim().toLowerCase();
                    String event  = payload.getOrDefault("event", "").trim().toLowerCase();

                    // If provider sent amount (usually in paise) try to map to refund amount
                    if (payload.containsKey("amount")) {
                        try {
                            double amountVal = Double.parseDouble(payload.get("amount"));
                            // many providers send amount in paise -> convert if it looks like paise (>1000)
                            double rupees = amountVal > 1000 ? amountVal / 100.0 : amountVal;
                            // defensive: set refundAmount if setter exists
                            try {
                                booking.setRefundAmount(Math.round(rupees * 100.0) / 100.0);
                            } catch (NoSuchMethodError | AbstractMethodError ignore) { /* ignore if field not present */ }
                        } catch (NumberFormatException ignore) { /* ignore parse errors */ }
                    }

                    // Decide refund state based on event/status
                    boolean treated = false;
                    if (event.contains("refund") || status.contains("refund") || status.contains("refunded") || status.contains("processed")) {
                        // Mark refunded/processed
                        try { booking.setRefundStatus("REFUNDED"); } catch (NoSuchMethodError | AbstractMethodError ignore) {}
                        bookingser.saveBooking(booking);
                        treated = true;
                    } else if (status.contains("failed") || event.contains("failed")) {
                        try { booking.setRefundStatus("REFUND_FAILED"); } catch (NoSuchMethodError | AbstractMethodError ignore) {}
                        bookingser.saveBooking(booking);
                        treated = true;
                    } else if (!status.isBlank() || !event.isBlank()) {
                        // any other known status -> mark pending
                        try { booking.setRefundStatus("REFUND_PENDING"); } catch (NoSuchMethodError | AbstractMethodError ignore) {}
                        bookingser.saveBooking(booking);
                        treated = true;
                    }

                    if (treated) {
                        return ResponseEntity.ok(Map.of("status", "ok", "paymentId", paymentId));
                    } else {
                        // nothing to do for this event
                        return ResponseEntity.ok(Map.of("status", "ignored", "reason", "unrecognized-status-or-event"));
                    }
                } else {
                    // no booking found for this payment id
                    return ResponseEntity.status(404).body(Map.of("error", "Booking not found for paymentId"));
                }
            }

            // fallback: unknown payload shape
            return ResponseEntity.badRequest().body(Map.of("error", "Missing bookingId or paymentId"));

        } catch (Exception e) {
            // preserve original behavior of returning 400 with error message
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
}
