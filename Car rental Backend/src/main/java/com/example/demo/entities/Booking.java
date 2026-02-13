package com.example.demo.entities;

import java.time.LocalDate;
import java.time.LocalDateTime;
import javax.persistence.*;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "car_id", nullable = false)
    private Car car;

    private LocalDate startDate;
    private LocalDate endDate;

    private double totalPrice;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    // Optional reservation expiry for PENDING_PAYMENT bookings
    private LocalDateTime reservedUntil;

    // Payment fields
    @Column(nullable = true, length = 100)
	private String paymentId; // provider txn id

	@Column(nullable = true, length = 50)
	private String paymentProvider; // e.g., "RAZORPAY", "STRIPE"
	
	@Column(nullable = true, length = 20)
	private String paymentStatus; // e.g., "PENDING", "SUCCESS", "FAILED"

    // Auditing fields
    @CreationTimestamp
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
 // ---- NEW: refund metadata ----
    private Double refundAmount; // amount (INR) that will be/refunded to user
    
    @Column(nullable = true)
    private String refundStatus = "NONE"; // NONE, REFUND_PENDING, REFUNDED, REFUND_FAILED
    
 // in Booking.java (entity)
    @Column(nullable = true, length = 100)
    private String refundId;

  

    
    public Booking() {}

    // Getters and Setters

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Car getCar() {
        return car;
    }

    public void setCar(Car car) {
        this.car = car;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public void setStatus(BookingStatus status) {
        this.status = status;
    }

    public LocalDateTime getReservedUntil() {
        return reservedUntil;
    }

    public void setReservedUntil(LocalDateTime reservedUntil) {
        this.reservedUntil = reservedUntil;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getPaymentProvider() {
        return paymentProvider;
    }

    public void setPaymentProvider(String paymentProvider) {
        this.paymentProvider = paymentProvider;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
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
    // ---- NEW getters/setters for refund fields ----
	public Double getRefundAmount() {
		return refundAmount;
	}

	public void setRefundAmount(Double refundAmount) {
		this.refundAmount = refundAmount;
	}

	public String getRefundStatus() {
		return refundStatus;
	}

	public void setRefundStatus(String refundStatus) {
		this.refundStatus = refundStatus;
	}
	
	
	
	public void setRefundId(String refundId) {
		this.refundId = refundId;
	}
	
	public String getRefundId() {
		return refundId;
	}

	@Override
	public String toString() {
		return "Booking [id=" + id + ", user=" + user + ", car=" + car + ", startDate=" + startDate + ", endDate="
				+ endDate + ", totalPrice=" + totalPrice + ", status=" + status + ", reservedUntil=" + reservedUntil
				+ ", paymentId=" + paymentId + ", paymentProvider=" + paymentProvider + ", paymentStatus="
				+ paymentStatus + ", createdAt=" + createdAt + ", updatedAt=" + updatedAt + ", refundAmount="
				+ refundAmount + ", refundStatus=" + refundStatus + "]";
	}
	

}
