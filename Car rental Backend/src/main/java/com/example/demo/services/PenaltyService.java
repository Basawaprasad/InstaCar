package com.example.demo.services;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.entities.Penalty;
import com.example.demo.repos.PenaltyRepository;


@Service
public class PenaltyService {

	@Autowired
	private PenaltyRepository penaltyRepository;

	public Penalty save(Penalty p) {
		return penaltyRepository.save(p);
	}

	public List<Penalty> findByBookingId(Long bookingId) {
		return penaltyRepository.findByBookingId(bookingId);
	}

	public List<Penalty> findUnsettled() {
		return penaltyRepository.findBySettledFalse();
	}

	public void markSettled(Penalty p) {
		p.setSettled(true);
		penaltyRepository.save(p);
	}
}
