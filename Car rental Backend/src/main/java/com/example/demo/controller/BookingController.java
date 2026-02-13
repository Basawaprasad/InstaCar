package com.example.demo.controller;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.demo.entities.Booking;
import com.example.demo.entities.BookingStatus;
import com.example.demo.entities.Car;
import com.example.demo.entities.Penalty;
import com.example.demo.entities.User;
import com.example.demo.security.RazorpayService;
import com.example.demo.services.Bookingser;
import com.example.demo.services.Carser;
import com.example.demo.services.EmailService;
import com.example.demo.services.PenaltyService;
import com.example.demo.services.Userser;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;

@RestController
@RequestMapping("/booking")
public class BookingController {

    @Autowired private Userser userser;
    @Autowired private Carser carser;
    @Autowired private Bookingser bookingser;
    @Autowired private EmailService emailService;
    @Autowired private RazorpayService razorpayService;
    @Autowired private PenaltyService penaltyService;

    // ------------------------
    // Helper methods
    // ------------------------

    /** Inclusive overlap: [aStart,aEnd] overlaps [bStart,bEnd]? */
    private boolean rangesOverlapInclusive(LocalDate aStart, LocalDate aEnd,
                                           LocalDate bStart, LocalDate bEnd) {
        if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;
        return !(aEnd.isBefore(bStart) || aStart.isAfter(bEnd));
    }

    /** Fetch all bookings for a car id. */
    @SuppressWarnings("unchecked")
    private List<Booking> fetchBookingsForCar(Long carId) {
        if (carId == null) return Collections.emptyList();
        long cid = carId;

        Object allObj = bookingser.getAllBookings();
        List<Booking> all;
        if (allObj instanceof List) {
            all = (List<Booking>) allObj;
        } else if (allObj instanceof Iterable) {
            all = new ArrayList<>();
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        } else {
            all = Collections.emptyList();
        }

        return all.stream()
                .filter(b -> b != null && b.getCar() != null && b.getCar().getId() == cid)
                .collect(Collectors.toList());
    }

    /** Only these statuses actually block availability. */
    private boolean isBlockingStatus(BookingStatus status) {
        return status == BookingStatus.PENDING_PAYMENT
            || status == BookingStatus.PENDING_APPROVAL
            || status == BookingStatus.ACTIVE;
    }

    /** Blocking bookings for a car within a range (CANCELLED/COMPLETED/REJECTED are ignored). */
    private List<Booking> overlappingBookingsForRange(Long carId, LocalDate start, LocalDate end) {
        List<Booking> forCar = fetchBookingsForCar(carId);
        return forCar.stream()
                .filter(b -> b.getStartDate() != null && b.getEndDate() != null)
                .filter(b -> isBlockingStatus(b.getStatus()))
                .filter(b -> rangesOverlapInclusive(start, end, b.getStartDate(), b.getEndDate()))
                .collect(Collectors.toList());
    }

    // ------------------------
    // Mapping helpers (used by NEW read-only endpoints)
    // ------------------------

    private Map<String, Object> mapBooking(Booking b) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", b.getId());
        m.put("startDate", b.getStartDate() != null ? b.getStartDate().toString() : null);
        m.put("endDate", b.getEndDate() != null ? b.getEndDate().toString() : null);
        m.put("totalPrice", b.getTotalPrice());
        m.put("status", b.getStatus() != null ? b.getStatus().name() : null);

        // payment info
        m.put("paymentStatus", b.getPaymentStatus());
        m.put("paymentProvider", b.getPaymentProvider());
        m.put("paymentId", b.getPaymentId());

        // user
        User u = b.getUser();
        if (u != null) {
            Map<String, Object> um = new HashMap<>();
            um.put("id", u.getId());
            um.put("fullname", u.getFullname());
            um.put("email", u.getEmail());
            um.put("drivingLicenseNumber", u.getDrivingLicenseNumber());
            // NOTE: If you have a real phone field, map it here. Previously role was sent as phone.
            m.put("user", um);
        } else {
            m.put("user", null);
        }

        // car
        Car c = b.getCar();
        if (c != null) {
            Map<String, Object> cm = new HashMap<>();
            cm.put("id", c.getId());
            cm.put("brand", c.getBrand());
            cm.put("model", c.getModel());
            cm.put("registrationNumber", c.getRegistrationNumber());
            cm.put("location", c.getLocation());
            cm.put("rentPerDay", c.getRentPerDay());
            cm.put("available", c.isAvailable());
            cm.put("imageUrl", c.getImageUrl());
            m.put("car", cm);
        } else {
            m.put("car", null);
        }

        return m;
    }

    private List<Map<String, Object>> mapBookings(List<Booking> list) {
        List<Map<String, Object>> response = new ArrayList<>();
        for (Booking b : list) response.add(mapBooking(b));
        return response;
    }

    private LocalDate tryParseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s.trim()); } catch (Exception e) { return null; }
    }

    // =========================================================================
    // EXISTING BUSINESS ENDPOINTS (UNCHANGED)
    // =========================================================================

    /** 1) CREATE booking -> PENDING_PAYMENT */
    @PostMapping("rent/{userid}/{carid}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> rentCar(
            @PathVariable Long userid,
            @PathVariable long carid,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        Optional<User> userOpt = userser.getUserById(userid);
        Optional<Car> carOpt = carser.getCarById(carid);

        if (userOpt.isEmpty() || carOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User or car not found"));
        }

        User user = userOpt.get();
        Car car = carOpt.get();

        // Block multiple concurrent bookings regardless of dates (original logic)
        List<Booking> activeBookings = bookingser.getBookingsByUserIdAndStatus(userid, BookingStatus.ACTIVE);
        List<Booking> pendingApprovals = bookingser.getBookingsByUserIdAndStatus(userid, BookingStatus.PENDING_APPROVAL);
        if (!activeBookings.isEmpty() || !pendingApprovals.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    Map.of("message", "You already have an active or pending booking. Please return or cancel it before booking another car."));
        }

        LocalDate start;
        LocalDate end;
        try {
            if (startDate == null || endDate == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Start date and end date are required."));
            }

            start = LocalDate.parse(startDate.trim());
            end   = LocalDate.parse(endDate.trim());

            if (end.isBefore(start)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "End date cannot be before start date."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid date format. Please use YYYY-MM-DD."));
        }

        // Availability ignoring cancelled/completed/rejected
        List<Booking> overlapping = overlappingBookingsForRange(carid, start, end);
        if (!overlapping.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Car not available for the selected dates."));
        }

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setCar(car);
        booking.setStartDate(start);
        booking.setEndDate(end);

        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1; // inclusive
        if (days <= 0) days = 1;
        booking.setTotalPrice(days * car.getRentPerDay());

        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        bookingser.saveBooking(booking);

        try {
            String subject = "Booking Created - Complete Payment";
            String body = "Hi " + user.getFullname() + ",\n\n" +
                    "Your booking has been created and is awaiting payment.\n\n" +
                    "Booking ID: " + booking.getId() + "\nCar: " + car.getBrand() + " " + car.getModel() + "\n" +
                    "From: " + start + "\nTo: " + end + "\nTotal Price: ₹" + booking.getTotalPrice() +
                    "\n\nPlease complete the payment to proceed. Thank you!";
            emailService.sendEmail(user.getEmail(), subject, body);
        } catch (Exception e) {
            System.err.println("Failed to send booking created email: " + e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
    }

    /** Create Razorpay order */
    @PostMapping({"/payment/create/{bookingId}", "/payment/order/{bookingId}"})
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> createPaymentOrder(@PathVariable Long bookingId) {
        Optional<Booking> bookingOpt = bookingser.getBookingById(bookingId);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
        }
        Booking booking = bookingOpt.get();

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Booking is not awaiting payment"));
        }

        try {
            String receipt = "booking_" + booking.getId();
            JSONObject orderJson = razorpayService.createOrder(booking.getTotalPrice(), receipt);

            Map<String, Object> resp = new HashMap<>();
            resp.put("order", orderJson.toMap());
            resp.put("keyId", razorpayService.getKeyId());
            resp.put("amount", orderJson.optInt("amount", (int) Math.round(booking.getTotalPrice() * 100)));
            resp.put("currency", orderJson.optString("currency", "INR"));
            resp.put("receipt", orderJson.optString("receipt", receipt));
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create payment order", "details", e.getMessage()));
        }
    }

    /** Confirm Payment */
    @PostMapping("/payment/confirm/{bookingId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> confirmPayment(@PathVariable Long bookingId,
                                            @RequestBody(required = false) Map<String, String> paymentInfo) {
        Optional<Booking> bookingOpt = bookingser.getBookingById(bookingId);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
        }

        Booking booking = bookingOpt.get();

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Booking not awaiting payment"));
        }

        String provider = paymentInfo != null ? paymentInfo.getOrDefault("provider", "UNKNOWN") : "UNKNOWN";
        String paymentId = paymentInfo != null ? paymentInfo.getOrDefault("paymentId", null) : null;
        String status = paymentInfo != null ? paymentInfo.getOrDefault("status", "PENDING") : "PENDING";

        String razorpayOrderId = paymentInfo != null ? paymentInfo.get("razorpay_order_id") : null;
        String razorpayPaymentId = paymentInfo != null ? paymentInfo.get("razorpay_payment_id") : null;
        String razorpaySignature = paymentInfo != null ? paymentInfo.get("razorpay_signature") : null;

        if (razorpayOrderId != null || razorpayPaymentId != null || razorpaySignature != null) {
            provider = "RAZORPAY";
            paymentId = razorpayPaymentId;
            boolean ok = razorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
            if (!ok) {
                booking.setPaymentProvider(provider);
                booking.setPaymentId(paymentId);
                booking.setPaymentStatus("FAILED");
                bookingser.saveBooking(booking);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid payment signature"));
            }
            status = "SUCCESS";
        }

        booking.setPaymentProvider(provider);
        booking.setPaymentId(paymentId);
        booking.setPaymentStatus(status);

        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        booking.setReservedUntil(null);
        bookingser.saveBooking(booking);

        try {
            String bookingDetails = "Payment received for booking ID: " + booking.getId() +
                    "\nCar: " + (booking.getCar() != null ? booking.getCar().getBrand() + " " + booking.getCar().getModel() : "N/A") +
                    "\nFrom: " + booking.getStartDate() + "\nTo: " + booking.getEndDate() +
                    "\nTotal Price: ₹" + booking.getTotalPrice();
            emailService.sendBookingConfirmation(booking.getUser().getEmail(), bookingDetails);
        } catch (Exception e) {
            System.err.println("Failed to send payment confirmation email: " + e.getMessage());
        }

        return ResponseEntity.ok(booking);
    }

    /** Admin approve -> ACTIVE */
    @PutMapping("/approve/{bookingId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveBooking(@PathVariable Long bookingId) {
        Optional<Booking> bookingOpt = bookingser.getBookingById(bookingId);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
        }
        Booking booking = bookingOpt.get();

        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Only PENDING_APPROVAL bookings can be approved"));
        }

        booking.setStatus(BookingStatus.ACTIVE);
        bookingser.saveBooking(booking);

        try {
            Car car = booking.getCar();
            String bookingDetails = "Booking Confirmed:\nCar: " + (car != null ? car.getBrand() + " " + car.getModel() : "N/A") +
                    "\nFrom: " + booking.getStartDate() + "\nTo: " + booking.getEndDate() +
                    "\nTotal Price: ₹" + booking.getTotalPrice();

            emailService.sendBookingConfirmation(booking.getUser().getEmail(), bookingDetails);

            String pickupSubject = "Pickup Instructions — Collect Keys at Katraj";
            String pickupBody = "Dear " + booking.getUser().getFullname() + ",\n\n" +
                    "Your booking (ID: " + booking.getId() + ") has been approved. You may collect the car keys from our Katraj office. " +
                    "Please bring a valid photo ID and your driving licence when you come to collect the vehicle. " +
                    "If you need to schedule a specific pickup time, please contact our support team.\n\n" +
                    "Katraj Office — Available during business hours.\n\n" +
                    "Thank you for choosing our service.\n\nRegards,\nITV Car Services";
            emailService.sendEmail(booking.getUser().getEmail(), pickupSubject, pickupBody);

        } catch (Exception e) {
            System.err.println("Failed to send approval email: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("message", "Booking approved and user notified"));
    }

    /** Admin reject -> CANCELLED */
    @PutMapping("/reject/{bookingId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectBooking(@PathVariable Long bookingId, @RequestBody(required = false) Map<String, String> body) {
        Optional<Booking> opt = bookingser.getBookingById(bookingId);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
        Booking booking = opt.get();

        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only PENDING_APPROVAL bookings can be rejected"));
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingser.saveBooking(booking);

        try {
            emailService.sendEmail(booking.getUser().getEmail(), "Booking Rejected",
                    "Your booking (ID: " + booking.getId() + ") was rejected by admin. Please contact support for details.");
        } catch (Exception e) {
            System.err.println("Failed to send rejection email: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("message", "Rejected and user notified"));
    }

    /** ADMIN: Get pending bookings */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Object> getPendingBookings() {
        Object allObj = bookingser.getAllBookings();
        List<Booking> all;
        if (allObj instanceof List) {
            all = (List<Booking>) allObj;
        } else if (allObj instanceof Iterable) {
            all = new ArrayList<>();
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        } else {
            all = Collections.emptyList();
        }

        List<Booking> pending = all.stream()
                .filter(b -> b.getStatus() == BookingStatus.PENDING_APPROVAL)
                .collect(Collectors.toList());

        return ResponseEntity.ok(pending);
    }

    /** USER: Get bookings by user */
    @GetMapping("/user/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Object> getBookingsByUser(@PathVariable long id) {
        return ResponseEntity.ok(bookingser.getBookingsByUserId(id));
    }

    /** Return car -> COMPLETED */
    @PutMapping("/return/{bookingId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('USER')")
    public ResponseEntity<?> returnCar(@PathVariable Long bookingId) {
        Optional<Booking> bookingOpt = bookingser.getBookingById(bookingId);
        if (bookingOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));

        Booking booking = bookingOpt.get();

        if (booking.getStatus() != BookingStatus.ACTIVE) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Only ACTIVE bookings can be returned"));
        }

        LocalDate returnDate = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        LocalDate originalEnd = booking.getEndDate() != null ? booking.getEndDate() : returnDate;
        booking.setEndDate(returnDate);

        long rentalDays = java.time.temporal.ChronoUnit.DAYS.between(booking.getStartDate(), returnDate) + 1;
        if (rentalDays <= 0) rentalDays = 1;
        double baseTotal = rentalDays * booking.getCar().getRentPerDay();

        double lateFee = 0.0;
        if (returnDate.isAfter(originalEnd)) {
            long overdueDays = java.time.temporal.ChronoUnit.DAYS.between(originalEnd, returnDate);
            double perDayFee = booking.getCar().getRentPerDay() * 0.5; // 50% per day
            double computed = perDayFee * overdueDays;
            double cap = booking.getTotalPrice() * 2.0;
            if (computed > cap) computed = cap;
            lateFee = computed;

            Penalty penalty = new Penalty();
            penalty.setBookingId(booking.getId());
            penalty.setOverdueDays((int) overdueDays);
            penalty.setAmount(lateFee);
            penalty.setSettled(false);
            penaltyService.save(penalty);
        }

        double finalTotal = baseTotal + lateFee;
        booking.setTotalPrice(finalTotal);
        booking.setStatus(BookingStatus.COMPLETED);
        bookingser.saveBooking(booking);

        try {
            Car car = booking.getCar();
            StringBuilder sb = new StringBuilder();
            sb.append("Your car has been returned successfully.\nCar: ")
                .append(car != null ? car.getBrand() + " " + car.getModel() : "N/A")
                .append("\nFrom: ").append(booking.getStartDate())
                .append("\nTo: ").append(returnDate)
                .append("\nBase amount: ₹").append(String.format("%.2f", baseTotal));
            if (lateFee > 0.0) {
                sb.append("\nLate fee: ₹").append(String.format("%.2f", lateFee))
                  .append("\nTotal charged: ₹").append(String.format("%.2f", finalTotal))
                  .append("\n\nLate fees will be invoiced/charged to your payment method if available.");
            } else {
                sb.append("\nTotal charged: ₹").append(String.format("%.2f", finalTotal));
            }

            emailService.sendEmail(booking.getUser().getEmail(), "Car Return Confirmation", sb.toString());
        } catch (Exception e) {
            System.err.println("Failed to send return email: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("message", "Car returned successfully", "totalDays", rentalDays, "totalPrice", finalTotal, "lateFee", lateFee));
    }

    /** USER cancel booking (user-scoped) */
    @PutMapping("/cancel/{userId}/{bookingId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> cancelBookingByUser(@PathVariable Long userId, @PathVariable Long bookingId) {
        Optional<Booking> bookingOpt = bookingser.getBookingById(bookingId);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
        }

        Booking booking = bookingOpt.get();

        if (!booking.getUser().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You are not authorized to cancel this booking."));
        }

        BookingStatus status = booking.getStatus();
        LocalDate startDate = booking.getStartDate();
        LocalDate today = LocalDate.now();

        if (status == BookingStatus.ACTIVE) {
            if (startDate != null && !startDate.isAfter(today)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Cannot cancel a booking that has already started or is today."));
            }
        }

        if (status != BookingStatus.PENDING_PAYMENT &&
            status != BookingStatus.PENDING_APPROVAL &&
            status != BookingStatus.ACTIVE) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Only PENDING_PAYMENT, PENDING_APPROVAL or ACTIVE bookings can be cancelled."));
        }

        try {
            String paymentStatus = booking.getPaymentStatus();
            String paymentId = booking.getPaymentId();

            if ("SUCCESS".equalsIgnoreCase(paymentStatus) && startDate != null && startDate.isAfter(today)) {
                double paid = booking.getTotalPrice();
                double refundAmount = Math.round(paid * 0.8 * 100.0) / 100.0;

                try {
                    Map<String, Object> notes = Map.of("bookingId", booking.getId(), "reason", "User cancelled before start - 20% fee applied");
                    Refund refund = razorpayService.createRefund(paymentId, refundAmount, notes);
                    if (refund != null) {
                        booking.setPaymentStatus("REFUNDED");
                    } else {
                        booking.setPaymentStatus("REFUND_PENDING");
                    }
                } catch (RazorpayException re) {
                    booking.setPaymentStatus("REFUND_FAILED");
                    System.err.println("Razorpay refund error for booking " + booking.getId() + ": " + re.getMessage());
                } catch (Exception e) {
                    booking.setPaymentStatus("REFUND_FAILED");
                    System.err.println("Unexpected refund error for booking " + booking.getId() + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("Error while preparing refund for booking " + booking.getId() + ": " + e.getMessage());
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setReservedUntil(null);
        bookingser.saveBooking(booking);

        try {
            StringBuilder sb = new StringBuilder();
            sb.append("Dear ").append(booking.getUser().getFullname()).append(",\n\n");
            sb.append("Your booking (ID: ").append(booking.getId()).append(") has been cancelled successfully.\n");

            if ("REFUNDED".equalsIgnoreCase(booking.getPaymentStatus()) ||
                "REFUND_PENDING".equalsIgnoreCase(booking.getPaymentStatus()) ||
                "REFUND_FAILED".equalsIgnoreCase(booking.getPaymentStatus())) {
                sb.append("As per our policy, a refund will be processed to your original payment method within 2 business days. ")
                  .append("Please note, a 20% cancellation fee will be deducted and you will receive 80% of your original payment.\n");
            } else if ("SUCCESS".equalsIgnoreCase(booking.getPaymentStatus())) {
                sb.append("A refund will be processed to your original payment method within 2 business days (80% refunded after 20% fee).\n");
            } else {
                sb.append("No payment was captured for this booking, so no refund is necessary.\n");
            }

            sb.append("\nIf you have any questions, please contact support.\n\nRegards,\nITV Car Services");
            emailService.sendEmail(booking.getUser().getEmail(), "Booking Cancelled - Refund Details", sb.toString());
        } catch (Exception e) {
            System.err.println("Failed to send cancellation email: " + e.getMessage());
        }

        return ResponseEntity.ok(booking);
    }

    /** Availability check (inclusive overlap; ignores non-blocking statuses) */
    @GetMapping("/availability/{carId}")
    public ResponseEntity<?> checkAvailability(
            @PathVariable Long carId,
            @RequestParam String startDate,
            @RequestParam String endDate) {

        LocalDate start;
        LocalDate end;
        try {
            start = LocalDate.parse(startDate);
            end   = LocalDate.parse(endDate);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid date format. Use YYYY-MM-DD."));
        }

        List<Booking> overlapping = overlappingBookingsForRange(carId, start, end);
        boolean available = overlapping.isEmpty();

        Map<String, Object> resp = new HashMap<>();
        resp.put("available", available);
        resp.put("blockingBookings", overlapping);

        return ResponseEntity.ok(resp);
    }

    /** ADMIN: Get active bookings (flattened DTO-like map with payment info) */
    @GetMapping("/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getActiveBookings() {
        Object allObj = bookingser.getAllBookings();
        List<Booking> all;
        if (allObj instanceof List) {
            all = (List<Booking>) allObj;
        } else if (allObj instanceof Iterable) {
            all = new ArrayList<>();
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        } else {
            all = Collections.emptyList();
        }

        List<Booking> active = all.stream()
                .filter(b -> b.getStatus() == BookingStatus.ACTIVE)
                .collect(Collectors.toList());

        return ResponseEntity.ok(mapBookings(active));
    }

    // =========================================================================
    // NEW: READ-ONLY/ADMIN SUPPORT ENDPOINTS (no business logic changes)
    // =========================================================================

    /** NEW: Return ALL bookings (flattened). */
 // add this in BookingController (replace your conflicting method)
    @GetMapping("/flat")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllBookingsFlattened() {
        Object allObj = bookingser.getAllBookings();
        List<Booking> all = new ArrayList<>();
        if (allObj instanceof List) {
            for (Object o : (List<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        } else if (allObj instanceof Iterable) {
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        }
        return ResponseEntity.ok(mapBookings(all)); // uses your mapBookings(...) helper
    }


    /** NEW: Get single booking flattened (for detail modal). */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getBookingByIdFlattened(@PathVariable Long id) {
        Optional<Booking> opt = bookingser.getBookingById(id);
        if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
        return ResponseEntity.ok(mapBooking(opt.get()));
    }

    /**
     * NEW: Query with filters for Admin table.
     * Params (all optional):
     *  q (search in user name/email, car brand/model, reg#),
     *  from (YYYY-MM-DD), to (YYYY-MM-DD) inclusive,
     *  status (enum name), userId, carId,
     *  provider (paymentProvider), paymentStatus (SUCCESS/PENDING/FAILED/REFUNDED)
     */
    @GetMapping("/query")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> queryBookings(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long carId,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) String paymentStatus
    ) {
        String qq = q != null ? q.trim().toLowerCase() : "";
        LocalDate fromD = tryParseDate(from);
        LocalDate toD = tryParseDate(to);
        String stat = status != null ? status.trim().toUpperCase() : null;
        String prov = provider != null ? provider.trim().toUpperCase() : null;
        String payS = paymentStatus != null ? paymentStatus.trim().toUpperCase() : null;

        Object allObj = bookingser.getAllBookings();
        List<Booking> all = new ArrayList<>();
        if (allObj instanceof List) {
            all = (List<Booking>) allObj;
        } else if (allObj instanceof Iterable) {
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        }

        List<Booking> filtered = all.stream().filter(b -> {
            // search q
            boolean okQ = true;
            if (!qq.isEmpty()) {
                String uname = b.getUser() != null ? Optional.ofNullable(b.getUser().getFullname()).orElse("") : "";
                String uemail = b.getUser() != null ? Optional.ofNullable(b.getUser().getEmail()).orElse("") : "";
                String brand = b.getCar() != null ? Optional.ofNullable(b.getCar().getBrand()).orElse("") : "";
                String model = b.getCar() != null ? Optional.ofNullable(b.getCar().getModel()).orElse("") : "";
                String reg = b.getCar() != null ? Optional.ofNullable(b.getCar().getRegistrationNumber()).orElse("") : "";
                okQ = (uname.toLowerCase().contains(qq) || uemail.toLowerCase().contains(qq) ||
                       brand.toLowerCase().contains(qq) || model.toLowerCase().contains(qq) ||
                       reg.toLowerCase().contains(qq));
            }

            if (!okQ) return false;

            // date range (overlap)
            if (fromD != null || toD != null) {
                LocalDate s = b.getStartDate();
                LocalDate e = b.getEndDate();
                LocalDate f = fromD != null ? fromD : LocalDate.MIN;
                LocalDate t = toD != null ? toD : LocalDate.MAX;
                if (s == null || e == null) return false;
                if (!rangesOverlapInclusive(f, t, s, e)) return false;
            }

            // status
            if (stat != null && b.getStatus() != null) {
                if (!b.getStatus().name().equalsIgnoreCase(stat)) return false;
            } else if (stat != null && b.getStatus() == null) {
                return false;
            }

            // userId
            if (userId != null) {
                if (b.getUser() == null || !Objects.equals(b.getUser().getId(), userId)) return false;
            }

            // carId
            if (carId != null) {
                if (b.getCar() == null || !Objects.equals(b.getCar().getId(), carId)) return false;
            }

            // provider
            if (prov != null) {
                String p = b.getPaymentProvider() != null ? b.getPaymentProvider().toUpperCase() : "";
                if (!p.equals(prov)) return false;
            }

            // paymentStatus
            if (payS != null) {
                String ps = b.getPaymentStatus() != null ? b.getPaymentStatus().toUpperCase() : "";
                if (!ps.equals(payS)) return false;
            }

            return true;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(mapBookings(filtered));
    }

    /** NEW: Compact counts for dashboard cards. */
    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSummary() {
        // users count
        int users = 0;
        try {
            Object u = userser.getAllUsers(); // adjust if you have different method
            if (u instanceof Collection) users = ((Collection<?>) u).size();
            else if (u instanceof Iterable) for (Object ignore : (Iterable<?>) u) users++;
        } catch (Exception e) { /* ignore */ }

        // cars count
        int cars = 0;
        try {
            Object c = carser.getAllCars(); // adjust method name if needed
            if (c instanceof Collection) cars = ((Collection<?>) c).size();
            else if (c instanceof Iterable) for (Object ignore : (Iterable<?>) c) cars++;
        } catch (Exception e) { /* ignore */ }

        // bookings
        Object allObj = bookingser.getAllBookings();
        List<Booking> all = new ArrayList<>();
        if (allObj instanceof List) {
            all = (List<Booking>) allObj;
        } else if (allObj instanceof Iterable) {
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        }

        long pending = all.stream().filter(b -> b.getStatus() == BookingStatus.PENDING_APPROVAL).count();
        long active = all.stream().filter(b -> b.getStatus() == BookingStatus.ACTIVE).count();
        long totalBookings = all.size();

        Map<String, Object> resp = new HashMap<>();
        resp.put("users", users);
        resp.put("cars", cars);
        resp.put("pending", pending);
        resp.put("active", active);
        resp.put("totalBookings", totalBookings);

        return ResponseEntity.ok(resp);
    }

    /** NEW: Daily revenue for last N days (default 30). */
    @GetMapping("/revenue/daily")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> dailyRevenue(@RequestParam(required = false, defaultValue = "30") int days) {
        if (days <= 0) days = 30;
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        LocalDate start = today.minusDays(days - 1);

        Object allObj = bookingser.getAllBookings();
        List<Booking> all = new ArrayList<>();
        if (allObj instanceof List) {
            all = (List<Booking>) allObj;
        } else if (allObj instanceof Iterable) {
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        }

        // group by endDate (or startDate if end is null)
        Map<LocalDate, Double> sums = new HashMap<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) {
            sums.put(d, 0.0);
        }
        for (Booking b : all) {
            LocalDate d = (b.getEndDate() != null) ? b.getEndDate() : b.getStartDate();
            if (d == null) continue;
            if (d.isBefore(start) || d.isAfter(today)) continue;

            // choose ONE version matching your getter
            // double amt = b.getTotalPrice();                         // primitive version
            Double tp = b.getTotalPrice(); double amt = (tp != null) ? tp : 0.0; // wrapper version

            sums.put(d, sums.get(d) + amt);
        }


        List<Map<String, Object>> series = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) {
            Map<String, Object> row = new HashMap<>();
            row.put("date", d.toString());
            row.put("revenue", Math.round(sums.getOrDefault(d, 0.0) * 100.0) / 100.0);
            series.add(row);
        }
        return ResponseEntity.ok(series);
    }
    @GetMapping("/summary/daily")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> dailyRevenue(
            @RequestParam String start,      // yyyy-MM-dd
            @RequestParam String end) {      // yyyy-MM-dd

        LocalDate from = LocalDate.parse(start);
        LocalDate to   = LocalDate.parse(end);
        if (to.isBefore(from)) {
            return ResponseEntity.badRequest().body(Map.of("message","end before start"));
        }

        // init sums map for every day in the range
        Map<LocalDate, Double> sums = new LinkedHashMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            sums.put(d, 0.0);
        }

        // read all bookings (business logic unchanged; just compute)
        Object allObj = bookingser.getAllBookings();
        List<Booking> all = new ArrayList<>();
        if (allObj instanceof List) {
            for (Object o : (List<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        } else if (allObj instanceof Iterable) {
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) all.add((Booking) o);
        }

        for (Booking b : all) {
            LocalDate bucket = (b.getEndDate() != null) ? b.getEndDate() : b.getStartDate();
            if (bucket == null) continue;
            if (bucket.isBefore(from) || bucket.isAfter(to)) continue;

            // totalPrice may be Double or double; unwrap safely
            Double tp = null;
            try { tp = (Double) b.getTotalPrice(); } catch (ClassCastException ignore) {}
            double amt = (tp == null) ? 0.0 : tp.doubleValue();

            sums.put(bucket, sums.getOrDefault(bucket, 0.0) + amt);
        }

        // also return grand total, count etc. (handy for your UI)
        double grandTotal = sums.values().stream().mapToDouble(Double::doubleValue).sum();
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("from", from.toString());
        resp.put("to", to.toString());
        resp.put("daily", sums);          // { "2025-11-01": 12345.0, ... }
        resp.put("total", grandTotal);    // sum over the range
        return ResponseEntity.ok(resp);
    }

    
}
