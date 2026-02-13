package com.example.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dto.RegisterResponse;
import com.example.demo.entities.User;
import com.example.demo.entities.UserRole;
import com.example.demo.repos.Userrepo;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.security.JwtUtil;
import com.example.demo.services.EmailService;
import com.example.demo.services.Userser;

@RestController
public class UserController {

    @Autowired
    private Userser userser;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private Userrepo userrepo;

    @Autowired
    private EmailService emailService;
    
    

    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/registeruser")
    public ResponseEntity<?> register(@Valid @RequestBody User user, BindingResult bindingResult) {
        System.out.println("Saving user: " + user.getEmail());

        // Validation errors from @Valid
        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            for (FieldError error : bindingResult.getFieldErrors()) {
                errors.put(error.getField(), error.getDefaultMessage());
            }
            return ResponseEntity.badRequest().body(errors);
        }

        // Additional required field checks
        if (user.getFullname() == null || user.getFullname().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Full name is required"));
        }
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        if (user.getDrivingLicenseNumber() == null || user.getDrivingLicenseNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Driving License Number is mandatory for registration."));
        }
        if (user.getPassword() == null || user.getCpassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password and Confirm Password are required"));
        }
        if (!user.getPassword().equals(user.getCpassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Passwords do not match"));
        }

        Optional<User> existingUser = userser.getUserByEmail(user.getEmail());
        if (existingUser.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
        }

        Optional<User> existingDL = userrepo.findByDrivingLicenseNumber(user.getDrivingLicenseNumber());
        if (existingDL.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Driving License already exists"));
        }

        // Assign default role if missing
        if (user.getRole() == null) {
            user.setRole(UserRole.USER);
        }

        User savedUser;
        try {
            // Call service to save. Make sure service has logging and flush for detailed diagnostics.
            savedUser = userser.saveUser(user);
        } catch (Exception e) {
            // Log full error
            e.printStackTrace();
            String errMsg = e.getClass().getSimpleName() + ": " + e.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database commit failed: " + errMsg));
        }

        // Send welcome email
        String subject = "Welcome to InstaCar Services 🚗";
        String body = "Hi " + savedUser.getFullname() + ",\n\n"
                + "Thank you for registering with InstaCar Services.\n"
                + "We’re excited to have you onboard! 🎉\n\n"
                + "Regards,\nTeam InstaCars";
        emailService.sendEmail(savedUser.getEmail(), subject, body);

        // Generate JWT
        UserDetails userDetails = new CustomUserDetails(savedUser);
        String jwt = jwtUtil.generateToken(userDetails);

        // Remove sensitive info
        savedUser.setPassword(null);
        savedUser.setCpassword(null);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RegisterResponse("Registration Successful", jwt, savedUser));
    }

    // Other endpoints unchanged...





    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        Optional<User> userOpt = userser.getUserByEmail(loginRequest.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }
        User user = userOpt.get();
        boolean passwordMatch = userser.checkPassword(loginRequest.getPassword(), user);
        if (!passwordMatch) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        // Generate JWT
        UserDetails userDetails = new CustomUserDetails(user);
        String jwt = jwtUtil.generateToken(userDetails);

        user.setPassword(null);
        user.setCpassword(null);

        return ResponseEntity.ok(
            Map.of(
                "jwt", jwt,
                "message", "Login successful",
                "user", user
            )
        );
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userser.getAllUsers();
        users.forEach(u -> {
            u.setPassword(null);
            u.setCpassword(null); 		
        });
        return ResponseEntity.ok(users);
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == principal.id")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        Optional<User> opt = userser.getUserById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        User u = opt.get();
        u.setPassword(null);
        u.setCpassword(null);
        return ResponseEntity.ok(u);
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @DeleteMapping("/delete/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUserById(@PathVariable Long id) {
        Optional<User> userOptional = userser.getUserById(id);

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        userser.deleteUser(id);
        return ResponseEntity.ok("User with ID " + id + " deleted successfully");
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @PutMapping("/edit/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == principal.id")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User updatedUser) {
        Optional<User> existingUserOpt = userser.getUserById(id);

        if (existingUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        User existingUser = existingUserOpt.get();
        existingUser.setFullname(updatedUser.getFullname());
        existingUser.setEmail(updatedUser.getEmail());

        User savedUser = userser.saveUser(existingUser);
        savedUser.setPassword(null);
        savedUser.setCpassword(null);

        return ResponseEntity.ok(savedUser);
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/rent/{userid}/{carid}")
    @PreAuthorize("hasRole('ADMIN') or #userid == principal.id")
    public ResponseEntity<?> rentCar(@PathVariable Long userid, @PathVariable long carid) {
        return userser.assignCarToUser(userid, carid);
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/return/{userid}")
    @PreAuthorize("hasRole('ADMIN') or #userid == principal.id")
    public ResponseEntity<?> returnCar(@PathVariable Long userid) {
        return userser.removeCarFromUser(userid);
    }
    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        request.getSession().invalidate();
        return ResponseEntity.ok("Logged out successfully");
    }

    @CrossOrigin(origins = "http://localhost:3000")
    @PostMapping("/testmail")
    public String sendTestMail(@RequestBody Map<String, String> request) {
        String to = request.get("to");
        String subject = request.get("subject");
        String body = request.get("body");

        emailService.sendEmail(to, subject, body);
        return "Mail sent to " + to;
    }
} 