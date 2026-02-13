package com.example.demo.repos;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.entities.Penalty;

public interface PenaltyRepository extends JpaRepository<Penalty, Long> {
    List<Penalty> findByBookingId(Long bookingId);
    List<Penalty> findBySettledFalse();
}
