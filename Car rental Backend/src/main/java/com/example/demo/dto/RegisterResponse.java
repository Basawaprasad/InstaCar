package com.example.demo.dto;

import com.example.demo.entities.User;

public class RegisterResponse {
    private String message;
    private String jwt;
    private User user;

    public RegisterResponse(String message, String jwt, User user) {
        this.message = message;
        this.jwt = jwt;
        this.user = user;
    }

    // Getter and Setter for message
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getJwt() {
        return jwt;
    }

    public void setJwt(String jwt) {
        this.jwt = jwt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
