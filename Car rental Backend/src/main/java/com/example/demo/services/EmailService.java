package com.example.demo.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;
    private final String FROM_EMAIL = "basawaprasad.b@gmail.com"; // configured username

    // Generic email method
    public void sendEmail(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(FROM_EMAIL);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    // ✅ OTP email helper
    public void sendOtpEmail(String to, String otp) {
        String subject = "Car Rental Service - Verify Your Email";
        String text = "Your OTP is: " + otp + "\nIt will expire in 10 minutes.";
        sendEmail(to, subject, text);
    }

    // Optional: Booking confirmation email
    public void sendBookingConfirmation(String to, String bookingDetails) {
        String subject = "Booking Confirmed!";
        String text = "Your booking is confirmed:\n" + bookingDetails;
        sendEmail(to, subject, text);
    }
}
