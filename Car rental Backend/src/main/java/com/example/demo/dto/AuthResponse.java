package com.example.demo.dto;

public class AuthResponse {

    private String jwt;

    // No-argument constructor
    public AuthResponse() {
        super();
    }

    // Parameterized constructor
    public AuthResponse(String jwt) {
        super();
        this.jwt = jwt;
    }

    // Getter
    public String getJwt() {
        return jwt;
    }

    // Setter
    public void setJwt(String jwt) {
        this.jwt = jwt;
    }

    // ToString
    @Override
    public String toString() {
        return "AuthResponse [jwt=" + jwt + "]";
    }
}
