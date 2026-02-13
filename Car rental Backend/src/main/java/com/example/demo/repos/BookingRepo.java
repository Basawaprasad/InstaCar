package com.example.demo.repos;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.entities.Booking;
import com.example.demo.entities.BookingStatus;

@Repository
public interface BookingRepo extends CrudRepository<Booking, Long> {

    List<Booking> findByUserId(Long userId);

    List<Booking> findByUserIdAndStatus(Long userId, BookingStatus status);

    // existing general overlap query (keeps backward compatibility)
    List<Booking> findByCarIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long carId,
            LocalDate endDate,
            LocalDate startDate);

    // NEW: only return bookings whose status is in blockingStatuses AND overlap the date range
    List<Booking> findByCarIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long carId,
            List<BookingStatus> statuses,
            LocalDate endDate,
            LocalDate startDate);

    // NEW: find booking by provider payment id (used by webhook/refund handling)
    Optional<Booking> findByPaymentId(String paymentId);

    // NEW: exact count of bookings referencing a car (used to prevent deletion)
    long countByCar_Id(long id);

    // kept exists-style helper (backwards compatible)
    boolean existsByCar_Id(long id);
    
    Optional<Booking> findByRefundId(String refundId);

}
