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
public class RideOffer {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(optional = false)
	private User owner; // driver/owner who posts ride

	private String carInfo; // free-text or reference to Car id

	private String fromLocation; // simple place name or address
	private String toLocation;
	private LocalDateTime departureTime;
	private int seatsTotal;
	private int seatsAvailable; // decrement on accept
	private double pricePerSeat; // INR
	private boolean isPublic; // visible to all or invite-only
	private String routeGeoJson; // optional: polyline/geojson for mapping
	private String notes;

	@Enumerated(EnumType.STRING)
	private OfferStatus status; // ACTIVE, CANCELLED, COMPLETED

	// audit fields
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	// getters/setters...
	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public User getOwner() {
		return owner;
	}
	public void setOwner(User owner) {
		this.owner = owner;
	}
	public String getCarInfo() {
		return carInfo;
	}
	public void setCarInfo(String carInfo) {
		this.carInfo = carInfo;
	}
	public String getFromLocation() {
		return fromLocation;
	}
	public void setFromLocation(String fromLocation) {
		this.fromLocation = fromLocation;
	}
	public String getToLocation() {
		return toLocation;
	}
	public void setToLocation(String toLocation) {
		this.toLocation = toLocation;
	}
	public LocalDateTime getDepartureTime() {
		return departureTime;
	}
	public void setDepartureTime(LocalDateTime departureTime) {
		this.departureTime = departureTime;
	}
	public int getSeatsTotal() {
		return seatsTotal;
	}
	public void setSeatsTotal(int seatsTotal) {
		this.seatsTotal = seatsTotal;
	}
	public int getSeatsAvailable() {
		return seatsAvailable;
	}
	public void setSeatsAvailable(int seatsAvailable) {
		this.seatsAvailable = seatsAvailable;
	}
	public double getPricePerSeat() {
		return pricePerSeat;
	}
	public void setPricePerSeat(double pricePerSeat) {
		this.pricePerSeat = pricePerSeat;
	}
	public boolean isPublic() {
		return isPublic;
	}
	public void setPublic(boolean isPublic) {
		this.isPublic = isPublic;
	}
	public String getRouteGeoJson() {
		return routeGeoJson;
	}
	public void setRouteGeoJson(String routeGeoJson) {
		this.routeGeoJson = routeGeoJson;
	}
	public String getNotes() {
		return notes;
	}
	public void setNotes(String notes) {
		this.notes = notes;
	}
	public OfferStatus getStatus() {
		return status;
	}
	public void setStatus(OfferStatus status) {
		this.status = status;
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
	@Override
	public String toString() {
		return "RideOffer [id=" + id + ", owner=" + owner + ", carInfo=" + carInfo + ", fromLocation=" + fromLocation
				+ ", toLocation=" + toLocation + ", departureTime=" + departureTime + ", seatsTotal=" + seatsTotal
				+ ", seatsAvailable=" + seatsAvailable + ", pricePerSeat=" + pricePerSeat + ", isPublic=" + isPublic
				+ ", routeGeoJson=" + routeGeoJson + ", notes=" + notes + ", status=" + status + ", createdAt="
				+ createdAt + ", updatedAt=" + updatedAt + "]";
	}
	
}
