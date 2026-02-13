package com.example.demo.services;



import java.time.LocalDateTime;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.demo.entities.User;
import com.example.demo.repos.Userrepo;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;



@Service

public class UserService {

    @Autowired
    private Userrepo userrepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    public void registerUser(User user) {
        if (userrepo.findByEmail(user.getEmail()).isPresent())
            throw new RuntimeException("Email already registered");

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setVerified(false);

        String otp = String.valueOf(new Random().nextInt(899999) + 100000);
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));

        userrepo.save(user);
        log.info("User registered: {}. OTP generated: {}", user.getEmail(), otp);

        emailService.sendOtpEmail(user.getEmail(), otp);
        log.info("OTP sent to email: {}", user.getEmail());
    }

    public void verifyOtp(String email, String otp) {
        User user = userrepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isVerified())
            throw new RuntimeException("User already verified");

        if (user.getOtpExpiry().isBefore(LocalDateTime.now()))
            throw new RuntimeException("OTP expired");

        if (!user.getOtp().equals(otp))
            throw new RuntimeException("Invalid OTP");

        user.setVerified(true);
        user.setOtp(null);
        user.setOtpExpiry(null);

        userrepo.save(user);
        log.info("User verified: {}", email);
    }
}
