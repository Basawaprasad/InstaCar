package com.example.demo.entities;

import java.time.LocalDateTime;
import javax.persistence.*;

@Entity
@Table(name = "penalty")
public class Penalty {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// reference booking id (not a relationship to avoid changing Booking)
	@Column(nullable = false)
	private Long bookingId;

	// how many overdue days when computed
	private Integer overdueDays;

	// computed late fee amount
	private Double amount;

	// whether fee has been charged / settled
	@Column(nullable = false)
	private Boolean settled = false;

	// timestamps
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

	public Penalty() {
	}

	// getters / setters
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getBookingId() {
		return bookingId;
	}

	public void setBookingId(Long bookingId) {
		this.bookingId = bookingId;
	}

	public Integer getOverdueDays() {
		return overdueDays;
	}

	public void setOverdueDays(Integer overdueDays) {
		this.overdueDays = overdueDays;
	}

	public Double getAmount() {
		return amount;
	}

	public void setAmount(Double amount) {
		this.amount = amount;
	}

	public Boolean getSettled() {
		return settled;
	}

	public void setSettled(Boolean settled) {
		this.settled = settled;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}
}
