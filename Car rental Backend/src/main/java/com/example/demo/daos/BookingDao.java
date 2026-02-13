package com.example.demo.daos;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.entities.Booking;
import com.example.demo.entities.BookingStatus;
import com.example.demo.entities.Car;
import com.example.demo.repos.BookingRepo;
import com.example.demo.repos.Carrepo;
import com.example.demo.services.Bookingser;
import com.example.demo.services.EmailService;
import com.example.demo.services.PaymentService; // --- NEW ---

@Service
public class BookingDao implements Bookingser {

    private final Carrepo carrepo;

    @Autowired
    private BookingRepo bookingRepo;

    @Autowired
    private EmailService emailService;

    // --- NEW: used to initiate refunds via provider ---
    @Autowired
    private PaymentService paymentService;

    public BookingDao(Carrepo carrepo) {
        this.carrepo = carrepo;
    }

    @Override
    public void saveBooking(Booking booking) {
        bookingRepo.save(booking);
    }

    @Override
    public Object getAllBookings() {
        return bookingRepo.findAll();
    }

    @Override
    public List<Booking> getBookingsByUserId(long id) {
        return bookingRepo.findByUserId(id);
    }

    @Override
    public Optional<Booking> getBookingById(Long bookingId) {
        return bookingRepo.findById(bookingId);
    }

    @Override
    public boolean returnCar(Long bookingId) {
        Optional<Booking> bookingOpt = bookingRepo.findById(bookingId);

        if (bookingOpt.isEmpty()) {
            return false; // Booking not found
        }

        Booking booking = bookingOpt.get();

        booking.setStatus(BookingStatus.COMPLETED);
        booking.setEndDate(LocalDate.now());
        bookingRepo.save(booking);

        Car car = booking.getCar();
        car.setAvailable(true);
        carrepo.save(car);

        return true;
    }

    // This method with int userId is redundant — your interface has this signature too, but with Long userId
    @Override
    public List<Booking> getBookingsByUserIdAndStatus(int userId, BookingStatus status) {
        return bookingRepo.findByUserIdAndStatus((long) userId, status);
    }

    /**
     * UPDATED: Use the new repo method that filters by status (only blocking statuses).
     * This prevents CANCELLED/RETURNED bookings from blocking new reservations.
     */
    @Override
    public List<Booking> getBookingsByCarIdAndDateRange(long carId, LocalDate startDate, LocalDate endDate) {
        // Only consider these statuses as blocking availability
        List<BookingStatus> blocking = Arrays.asList(BookingStatus.ACTIVE, BookingStatus.PENDING_APPROVAL);

        // call the new derived repo method (param order: carId, statuses, endDate, startDate)
        return bookingRepo.findByCarIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                carId, blocking, endDate, startDate);
    }

    @Override
    @Transactional
    public boolean cancelBooking(Long bookingId) {
        Optional<Booking> bookingOpt = bookingRepo.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            throw new RuntimeException("Booking not found");
        }

        Booking booking = bookingOpt.get();
        BookingStatus status = booking.getStatus();
        LocalDate startDate = booking.getStartDate();
        LocalDate today = LocalDate.now();

        // Disallow cancellation if booking already started or starts today
        if (startDate != null && !startDate.isAfter(today)) {
            throw new RuntimeException("Cannot cancel booking that has already started or today");
        }

        // Allow cancelling PENDING_PAYMENT, PENDING_APPROVAL or ACTIVE (if startDate > today)
        if (status != BookingStatus.PENDING_APPROVAL && status != BookingStatus.ACTIVE && status != BookingStatus.PENDING_PAYMENT) {
            throw new RuntimeException("Only PENDING_PAYMENT, PENDING_APPROVAL or ACTIVE bookings can be cancelled");
        }

        // Proceed to cancel
        booking.setStatus(BookingStatus.CANCELLED);

        Car car = booking.getCar();
        if (car != null) {
            car.setAvailable(true);
            car.setCurrentUser(null);
            carrepo.save(car);
        }

        // --- NEW: If booking was paid, initiate 80% refund (20% penalty) ---
        try {
            String paymentStatus = booking.getPaymentStatus();
            if (paymentStatus != null && paymentStatus.equalsIgnoreCase("SUCCESS")) {
                double paidAmount = booking.getTotalPrice(); // assumes totalPrice is what user paid
                double refundAmount = Math.round(paidAmount * 0.8 * 100.0) / 100.0; // 80% rounded to 2 decimals

                // set refund metadata and persist
                try {
                    // booking may have fields refundAmount/refundStatus; set them if present
                    booking.setRefundAmount(refundAmount);
                    booking.setRefundStatus("REFUND_PENDING");
                } catch (NoSuchMethodError | AbstractMethodError ignore) {
                    // in case Booking entity doesn't have those setters (defensive), ignore and proceed
                }
                bookingRepo.save(booking);

                // attempt provider refund (best-effort)
                try {
                    boolean refundOk = paymentService.processRefund(bookingId, refundAmount, "User cancelled before start (20% penalty)");
                    if (refundOk) {
                        booking.setRefundStatus("REFUNDED");
                    } else {
                        booking.setRefundStatus("REFUND_FAILED");
                    }
                } catch (Exception e) {
                    // mark refund failed but do not rollback cancellation
                    booking.setRefundStatus("REFUND_FAILED");
                    System.err.println("Refund failed for booking " + booking.getId() + ": " + e.getMessage());
                }
            } else {
                // not paid - no refund
                try {
                    booking.setRefundAmount(0.0);
                    booking.setRefundStatus("NONE");
                } catch (NoSuchMethodError | AbstractMethodError ignore) {}
                bookingRepo.save(booking);
            }
        } catch (Exception e) {
            // ensure cancellation is not rolled back for refund errors; log and continue
            System.err.println("Error while handling refund for booking " + booking.getId() + ": " + e.getMessage());
        }

        bookingRepo.save(booking);

        // Send notification email (best-effort) including refund info if any
        try {
            StringBuilder body = new StringBuilder();
            body.append("Your booking for car ").append(car != null ? car.getBrand() + " " + car.getModel() : "")
                .append(" has been cancelled successfully.");

            if (booking.getRefundAmount() != null && booking.getRefundAmount() > 0) {
                body.append("\nA refund of ₹").append(booking.getRefundAmount())
                    .append(" has been initiated to your original payment method. A 20% cancellation fee was applied.");
            }

            body.append("\nIf you have questions, please contact support.");

            emailService.sendEmail(booking.getUser().getEmail(), "Booking Cancelled", body.toString());
        } catch (Exception e) {
            System.err.println("Failed to send cancellation email: " + e.getMessage());
        }

        return true;
    }


    @Override
    public List<Booking> getBookingsByUserIdAndStatus(Long userId, BookingStatus status) {
        return bookingRepo.findByUserIdAndStatus(userId, status);
    }

    // This looks like a duplicate of getBookingsByUserId(long id)
    @Override
    public List<Booking> getBookingsByUserId1(long id) {
        return bookingRepo.findByUserId(id);
    }

    @Override
    @Transactional
    public Booking confirmPayment(Long bookingId, Map<String, String> paymentInfo) {
        Optional<Booking> bookingOpt = bookingRepo.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            throw new RuntimeException("Booking not found");
        }
        Booking booking = bookingOpt.get();

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new RuntimeException("Booking is not awaiting payment");
        }

        String paymentId = paymentInfo.get("paymentId");
        String provider = paymentInfo.getOrDefault("provider", "UNKNOWN");
        String status = paymentInfo.getOrDefault("status", "SUCCESS");

        if (paymentId == null || paymentId.isBlank()) {
            throw new RuntimeException("Invalid paymentId");
        }

        // if status is not success, record and fail
        if (!"SUCCESS".equalsIgnoreCase(status)) {
            booking.setPaymentId(paymentId);
            booking.setPaymentProvider(provider);
            booking.setPaymentStatus(status);
            bookingRepo.save(booking);
            throw new RuntimeException("Payment not successful: " + status);
        }

        // Mark booking paid / awaiting approval
        booking.setPaymentId(paymentId);
        booking.setPaymentProvider(provider);
        booking.setPaymentStatus("SUCCESS");
        booking.setReservedUntil(null);
        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        bookingRepo.save(booking);

        // Mark car unavailable
        Car car = booking.getCar();
        if (car != null) {
            car.setAvailable(false);
            carrepo.save(car);
        }

        // notify user (best-effort)
        try {
            emailService.sendBookingConfirmation(booking.getUser().getEmail(),
                    "Payment received for booking ID: " + booking.getId() + ". Booking is awaiting admin approval.");
        } catch (Exception e) {
            System.err.println("Failed to send payment confirmation email: " + e.getMessage());
        }

        return booking;
    }

	@Override
	public Object getBookingsByUserIdAndStatus() {
		// TODO Auto-generated method stub
		return null;
	}

	// --- NEW: count bookings referencing a car (used by CarController.deleteCar) ---
	public long countByCarId(long id) {
	    // return a conservative count: if any booking exists for this car, report 1; otherwise 0
	    return bookingRepo.existsByCar_Id(id) ? 1L : 0L;
	}

	@Override
	public Optional<Booking> getBookingByPaymentId(String paymentId) {
		
		return Optional.empty();
	}
}
