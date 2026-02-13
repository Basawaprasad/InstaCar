package com.example.demo.entities;

import java.time.LocalDateTime;

import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;

@Entity
public class RideRequest {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(optional = false)
	private RideOffer offer;

	@ManyToOne(optional = false)
	private User rider;

	private int seatsRequested; // usually 1
	private double amount; // seatsRequested * pricePerSeat
	private String paymentId; // payment provider txn id (if paid)
	private String paymentStatus;// PENDING, SUCCESS, FAILED, REFUNDED

	@Enumerated(EnumType.STRING)
	private RequestStatus status; // PENDING, ACCEPTED, REJECTED, CANCELLED

	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	// getters/setters...
}
