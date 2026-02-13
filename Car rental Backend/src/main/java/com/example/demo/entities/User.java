package com.example.demo.entities;

import javax.persistence.*;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "filled with full name")
    @Size(min = 3, max = 100, message = "Full name must be between 3 and 100 characters")
    @Pattern(regexp = "^[A-Za-z ]+$", message = "Full name must contain only letters and spaces")
    private String fullname;

    @NotNull(message = "Email is required")
    @Email(message = "should be in email format")
    @Size(max = 150, message = "Email must be less than 150 characters")
    @Column(unique = true)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @NotNull(message = "Password is required")
    private String password;

    @Transient
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
  
    private String cpassword;



    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "rented_car_id", referencedColumnName = "id", unique = true, nullable = true)
    private Car rentedCar;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @NotNull(message = "Driving License Number is required")
    @Column(unique = true, nullable = false)
    @Pattern(
            regexp = "^[A-Z]{2}[0-9]{2}[0-9A-Z]{4,12}$",
            message = "Driving license must be a valid Indian format (e.g., KA01 2023001234567)"
        )
    private String drivingLicenseNumber;

    // Auditing fields
    @CreationTimestamp
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // OTP-related fields
    private String otp;

    private LocalDateTime otpExpiry;

    private boolean verified = false;

    public User() {
    }

    public User(Long id, String fullname, String email, String password, String cpassword, Car rentedCar, UserRole role,
            String drivingLicenseNumber) {
        this.id = id;
        this.fullname = fullname;
        this.email = email;
        this.password = password;
        this.cpassword = cpassword;
        this.rentedCar = rentedCar;
        this.role = role;
        this.drivingLicenseNumber = drivingLicenseNumber;
        this.verified = false;
    }

    // Getters and setters with consistent Long id
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullname() {
        return fullname;
    }

    public void setFullname(String fullname) {
        this.fullname = fullname;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    // No getter for password, or annotate with @JsonIgnore if you want to expose getter only
    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getCpassword() {
        return cpassword;
    }

    public void setCpassword(String cpassword) {
        this.cpassword = cpassword;
    }

    public Car getRentedCar() {
        return rentedCar;
    }

    public void setRentedCar(Car rentedCar) {
        this.rentedCar = rentedCar;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public String getDrivingLicenseNumber() {
        return drivingLicenseNumber;
    }

    public void setDrivingLicenseNumber(String drivingLicenseNumber) {
        this.drivingLicenseNumber = drivingLicenseNumber;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }

    public LocalDateTime getOtpExpiry() {
        return otpExpiry;
    }

    public void setOtpExpiry(LocalDateTime otpExpiry) {
        this.otpExpiry = otpExpiry;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    @Override
    public String toString() {
        return "User [id=" + id + ", fullname=" + fullname + ", email=" + email 
                + ", rentedCar=" + rentedCar + ", role=" + role 
                + ", drivingLicenseNumber=" + drivingLicenseNumber 
                + ", otp=" + otp + ", otpExpiry=" + otpExpiry + ", verified=" + verified 
                + ", createdAt=" + createdAt + ", updatedAt=" + updatedAt + "]";
    }
}
