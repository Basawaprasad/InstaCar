package com.example.demo.daos;

import java.util.Map;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.entities.Booking;
import com.example.demo.entities.BookingStatus;
import com.example.demo.entities.Car;
import com.example.demo.repos.BookingRepo;
import com.example.demo.repos.Carrepo;
import com.example.demo.services.PaymentService;
import com.example.demo.security.RazorpayService;
import com.example.demo.services.EmailService;
import com.razorpay.Refund;
import com.razorpay.RazorpayException;

@Service
public class PaymentServiceDao implements PaymentService {

    @Autowired
    private BookingRepo bookingRepo;

    @Autowired
    private Carrepo carrepo;

    // NEW: use the centralized RazorpayService for refunds
    @Autowired
    private RazorpayService razorpayService;

    // NEW: email service to notify user about refund (best-effort)
    @Autowired
    private EmailService emailService;

    @Override
    public Booking verifyAndConfirmPayment(Long bookingId, Map<String, String> paymentInfo) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // only confirm if currently awaiting payment
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new RuntimeException("Booking is not awaiting payment");
        }

        // Basic checks - you should replace with real provider verification
        String paymentId = paymentInfo.get("paymentId");
        String provider = paymentInfo.getOrDefault("provider", "UNKNOWN");
        String status = paymentInfo.getOrDefault("status", "SUCCESS");
        String signature = paymentInfo.get("signature"); // optional

        // Example placeholder: verify signature or call provider API here
        // boolean valid = verifyWithProvider(paymentId, signature);
        // if (!valid) throw new RuntimeException("Payment verification failed");

        // For now: accept if paymentId present and status = SUCCESS (frontend must ensure it)
        if (paymentId == null || paymentId.isBlank()) {
            throw new RuntimeException("Missing paymentId");
        }
        if (!"SUCCESS".equalsIgnoreCase(status)) {
            // record failed payment attempt
            booking.setPaymentId(paymentId);
            booking.setPaymentProvider(provider);
            booking.setPaymentStatus(status);
            bookingRepo.save(booking);
            throw new RuntimeException("Payment not successful: " + status);
        }

        // mark booking paid (PENDING_APPROVAL), persist payment info, clear reservation
        booking.setPaymentId(paymentId);
        booking.setPaymentProvider(provider);
        booking.setPaymentStatus("SUCCESS");
        booking.setReservedUntil(null);
        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        bookingRepo.save(booking);

        // mark car unavailable
        Car car = booking.getCar();
        if (car != null) {
            car.setAvailable(false);
            carrepo.save(car);
        }

        // optionally send notification email outside this method (controller or listener)
        return booking;
    }

    /**
     * NEW: Process a refund for a booking.
     * - updates booking.refundAmount and booking.refundStatus
     * - calls RazorpayService.createRefund(...) to initiate a provider refund
     * - returns true when refund was initiated/succeeded, false otherwise
     *
     * Note: throws exceptions from provider to allow controller/service to surface errors.
     */
    @Override
    public boolean processRefund(Long bookingId, double amount, String reason) throws Exception {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (amount <= 0) {
            throw new IllegalArgumentException("Refund amount must be positive");
        }

        // set pending state and persist
        booking.setRefundAmount(amount);
        booking.setRefundStatus("REFUND_PENDING");
        bookingRepo.save(booking);

        String paymentId = booking.getPaymentId();
        if (paymentId == null || paymentId.isBlank()) {
            booking.setRefundStatus("REFUND_FAILED");
            bookingRepo.save(booking);
            throw new RuntimeException("Original payment id missing — cannot refund");
        }

        try {
            // call centralized refund helper; returns com.razorpay.Refund
            Refund refund = razorpayService.createRefund(paymentId, amount, Map.of("bookingId", bookingId, "reason", reason));

            // Try to parse useful info from the Refund object. Razorpay's SDK often returns a JSON-like object when toString() is called.
            String status = null;
            try {
                JSONObject json = new JSONObject(refund.toString());
                status = json.optString("status", null);
            } catch (Exception ignore) {
                // if parsing fails, fallback to a created status
            }

            // Treat commonly returned statuses as success
            if (status != null && (status.equalsIgnoreCase("processed") || status.equalsIgnoreCase("successful") || status.equalsIgnoreCase("refunded") || status.equalsIgnoreCase("created"))) {
                booking.setRefundStatus("REFUNDED");
                bookingRepo.save(booking);
                // Notify user (best-effort)
                try {
                    String body = "Your refund of ₹" + booking.getRefundAmount() + " for booking ID " + booking.getId() +
                                  " has been initiated successfully. It may take a few business days to reflect in your account.";
                    emailService.sendEmail(booking.getUser().getEmail(), "Refund Initiated", body);
                } catch (Exception e) {
                    // don't fail the refund if email fails
                    System.err.println("Failed to send refund email: " + e.getMessage());
                }
                return true;
            } else {
                booking.setRefundStatus("REFUND_FAILED");
                bookingRepo.save(booking);
                return false;
            }
        } catch (RazorpayException re) {
            booking.setRefundStatus("REFUND_FAILED");
            bookingRepo.save(booking);
            // rethrow so caller can handle/log provider error
            throw re;
        } catch (Exception e) {
            booking.setRefundStatus("REFUND_FAILED");
            bookingRepo.save(booking);
            throw e;
        }
    }
}
