// src/main/java/com/example/demo/services/Bookingser.java
package com.example.demo.services;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.example.demo.entities.Booking;
import com.example.demo.entities.BookingStatus;

public interface Bookingser {
    void saveBooking(Booking booking);
    Object getAllBookings();
    Optional<Booking> getBookingById(Long bookingId);
    boolean returnCar(Long bookingId);
    List<Booking> getBookingsByUserIdAndStatus(Long userId, BookingStatus active);
    List<Booking> getBookingsByCarIdAndDateRange(long carId, LocalDate startDate, LocalDate endDate);
    boolean cancelBooking(Long bookingId);
    List<Booking> getBookingsByUserIdAndStatus(int userId, BookingStatus status);
    List<Booking> getBookingsByUserId1(long id);
    Object getBookingsByUserId(long id);

    // New: confirm payment for booking (delegates to PaymentService)
    Booking confirmPayment(Long bookingId, Map<String, String> paymentInfo);
	Object getBookingsByUserIdAndStatus();

    // --------- ADDED (non-breaking) ----------
    /**
     * Find a booking by the payment provider's transaction id.
     * This is used by webhook/refund handlers to correlate provider events to bookings.
     *
     * @param paymentId provider transaction id (e.g., razorpay payment id)
     * @return Optional containing the Booking if found
     */
    Optional<Booking> getBookingByPaymentId(String paymentId);
    // -----------------------------------------
	long countByCarId(long id);
}
