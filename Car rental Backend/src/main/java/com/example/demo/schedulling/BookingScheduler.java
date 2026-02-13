package com.example.demo.schedulling;


import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.entities.Booking;
import com.example.demo.entities.BookingStatus;
import com.example.demo.entities.Penalty;
import com.example.demo.services.Bookingser;
import com.example.demo.services.Carser;
import com.example.demo.services.EmailService;
import com.example.demo.services.PenaltyService;

@Component
public class BookingScheduler {

    @Autowired
    private Bookingser bookingser;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PenaltyService penaltyService;

    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
    private static final double LATE_FEE_FACTOR = 0.5; // 50% of rent/day
    private static final double LATE_FEE_CAP_FACTOR = 2.0; // cap: 200% of original booking total

    // runs daily at 09:00 IST
    @Scheduled(cron = "0 0 9 * * ?", zone = "Asia/Kolkata")
    @Transactional
    public void dailyChecks() {
        LocalDate today = LocalDate.now(ZONE);
        Object allObj = bookingser.getAllBookings();
        List<Booking> all = iterableToList(allObj);

        sendReminders(all, today);
        processOverdues(all, today);
    }

    private void sendReminders(List<Booking> all, LocalDate today) {
        // 24-hours prior reminders
        LocalDate tomorrow = today.plusDays(1);
        List<Booking> toRemind = all.stream()
            .filter(b -> b.getStatus() == BookingStatus.ACTIVE)
            .filter(b -> b.getEndDate() != null && b.getEndDate().isEqual(tomorrow))
            .collect(Collectors.toList());

        for (Booking b : toRemind) {
            try {
                String subject = "Reminder: Your booking ends tomorrow — ID " + b.getId();
                String body = "Hi " + b.getUser().getFullname() + ",\n\n"
                        + "This is a reminder that your booking (ID: " + b.getId() + ") is scheduled to end on "
                        + b.getEndDate() + ". Please return the vehicle by the end of that day or contact support to extend.\n\nRegards,\nInstaCar Services";
                emailService.sendEmail(b.getUser().getEmail(), subject, body);
            } catch (Exception e) {
                System.err.println("Failed sending 24h reminder for booking " + b.getId() + ": " + e.getMessage());
            }
        }

        // Same-day reminders (ends today)
        List<Booking> endsToday = all.stream()
            .filter(b -> b.getStatus() == BookingStatus.ACTIVE)
            .filter(b -> b.getEndDate() != null && b.getEndDate().isEqual(today))
            .collect(Collectors.toList());

        for (Booking b : endsToday) {
            try {
                String subject = "Reminder: Your booking is due today — ID " + b.getId();
                String body = "Hi " + b.getUser().getFullname() + ",\n\n"
                        + "Your booking (ID: " + b.getId() + ") is due today (" + b.getEndDate() + "). Please return to avoid late fees.\n\nRegards,\nInstaCar Services";
                emailService.sendEmail(b.getUser().getEmail(), subject, body);
            } catch (Exception e) {
                System.err.println("Failed sending same-day reminder for booking " + b.getId() + ": " + e.getMessage());
            }
        }
    }

    private void processOverdues(List<Booking> all, LocalDate today) {
        List<Booking> overdue = all.stream()
            .filter(b -> b.getStatus() == BookingStatus.ACTIVE)
            .filter(b -> b.getEndDate() != null && b.getEndDate().isBefore(today))
            .collect(Collectors.toList());

        for (Booking b : overdue) {
            try {
                long overdueDays = java.time.temporal.ChronoUnit.DAYS.between(b.getEndDate(), today);
                if (overdueDays <= 0) continue;

                // find existing penalty for booking (if any) and update
                List<Penalty> existing = penaltyService.findByBookingId(b.getId());
                Penalty penalty;
                double perDayFee = b.getCar().getRentPerDay() * LATE_FEE_FACTOR;
                double computed = perDayFee * overdueDays;
                double cap = b.getTotalPrice() * LATE_FEE_CAP_FACTOR;
                if (computed > cap) computed = cap;

                if (existing.isEmpty()) {
                    penalty = new Penalty();
                    penalty.setBookingId(b.getId());
                    penalty.setOverdueDays((int) overdueDays);
                    penalty.setAmount(computed);
                    penalty.setSettled(false);
                } else {
                    // update the first entry (you might choose to keep history instead)
                    penalty = existing.get(0);
                    penalty.setOverdueDays((int) overdueDays);
                    penalty.setAmount(computed);
                }
                penaltyService.save(penalty);

                // send professional overdue email
                String subject = "Overdue Notice — Booking ID " + b.getId();
                String body = String.format("Dear %s,\n\nOur records show your booking (ID: %d) for %s %s was due on %s and remains with you.\n\nOverdue days: %d\nLate fee (so far): ₹%.2f\n\nPlease return the vehicle immediately to avoid further charges. The late fee will be invoiced and must be settled.\n\nRegards,\nInstaCar Services",
                        b.getUser().getFullname(),
                        b.getId(),
                        b.getCar().getBrand(),
                        b.getCar().getModel(),
                        b.getEndDate().toString(),
                        overdueDays,
                        computed);
                emailService.sendEmail(b.getUser().getEmail(), subject, body);

            } catch (Exception e) {
                System.err.println("Error processing overdue booking " + b.getId() + ": " + e.getMessage());
            }
        }
    }

    @SuppressWarnings("unchecked")
    private List<Booking> iterableToList(Object allObj) {
        if (allObj instanceof List) return (List<Booking>) allObj;
        List<Booking> out = new ArrayList<>();
        if (allObj instanceof Iterable) {
            for (Object o : (Iterable<?>) allObj) if (o instanceof Booking) out.add((Booking) o);
        }
        return out;
    }
}
