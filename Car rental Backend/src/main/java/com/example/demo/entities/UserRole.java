package com.example.demo.entities;

//public enum UserRole {
//    ADMIN,
//    USER
//    
//
//}


import com.fasterxml.jackson.annotation.JsonCreator;

public enum UserRole {
    ADMIN,
    USER,
	Owner;
    @JsonCreator
    public static UserRole fromString(String value) {
        return UserRole.valueOf(value.toUpperCase());
    }
}
