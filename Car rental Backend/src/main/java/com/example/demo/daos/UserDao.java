package com.example.demo.daos;

import java.util.List;
import java.util.Optional;

import javax.transaction.Transactional;
import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.demo.entities.Car;
import com.example.demo.entities.User;
import com.example.demo.entities.UserRole;
import com.example.demo.repos.Carrepo;
import com.example.demo.repos.Userrepo;
import com.example.demo.services.Userser;

@Service
public class UserDao implements Userser {

    @Autowired
    private Userrepo userrepo;

    @Autowired
    private Carrepo carrepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Removed unused fields: role, email, password

    @Override
    public User saveUser(User user) {
        if (!user.getPassword().equals(user.getCpassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (user.getRole() == null) {
            user.setRole(UserRole.USER);
        }

        // Encode password before saving
        String hashed = passwordEncoder.encode(user.getPassword());
        user.setPassword(hashed);
        user.setCpassword(null); // Clear confirm password before saving

        return userrepo.save(user);
    }

    @Override
    public Optional<User> getUserByEmail(String email) {
        return userrepo.findByEmail(email);
    }

    @Override
    public boolean checkPassword(String rawPassword, User user) {
        if (user == null || user.getPassword() == null) return false;
        return passwordEncoder.matches(rawPassword, user.getPassword());
    }

    @Override
    public List<User> getAllUsers() {
        return (List<User>) userrepo.findAll();
    }

    @Override
    public Optional<User> getUserById(Long id) {
        return userrepo.findById(id);
    }

    @Override
    public void deleteUser(Long id) {
        userrepo.deleteById(id);
    }

    @Transactional
    @Override
    public ResponseEntity<?> assignCarToUser(Long userid, Long carid) {
        Optional<User> userOpt = userrepo.findById(userid);
        Optional<Car> carOpt = carrepo.findById(carid);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        if (carOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Car not found");
        }

        User user = userOpt.get();
        Car car = carOpt.get();

        if (user.getRentedCar() != null) {
            return ResponseEntity.badRequest().body("User already has a rented car");
        }
        if (car.getCurrentUser() != null) {
            return ResponseEntity.badRequest().body("Car already rented");
        }

        user.setRentedCar(car);
        car.setCurrentUser(user);

        userrepo.save(user);
        carrepo.save(car);

        return ResponseEntity.ok(user);
    }

    @Transactional
    @Override
    public ResponseEntity<?> removeCarFromUser(Long userid) {
        Optional<User> userOpt = userrepo.findById(userid);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        User user = userOpt.get();

        Car rentedCar = user.getRentedCar();
        if (rentedCar == null) {
            return ResponseEntity.badRequest().body("User has no rented car");
        }

        user.setRentedCar(null);
        rentedCar.setCurrentUser(null);

        userrepo.save(user);
        carrepo.save(rentedCar);

        return ResponseEntity.ok(user);
    }

    @Override
    public void registerUser(@Valid User user) {
        // Implement registration logic (e.g., call saveUser)
        saveUser(user);
        // You may want to generate OTP here and send email for verification
    }

    @Override
    public void verifyOtp(String email, String otp) {
        Optional<User> userOpt = userrepo.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found");
        }

        User user = userOpt.get();
        if (user.getOtp() != null && user.getOtp().equals(otp)) {
            if (user.getOtpExpiry() != null && user.getOtpExpiry().isAfter(java.time.LocalDateTime.now())) {
                user.setVerified(true);
                user.setOtp(null);
                user.setOtpExpiry(null);
                userrepo.save(user);
            } else {
                throw new IllegalArgumentException("OTP expired");
            }
        } else {
            throw new IllegalArgumentException("Invalid OTP");
        }
    }
}
