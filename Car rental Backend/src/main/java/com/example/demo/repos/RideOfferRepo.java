package com.example.demo.repos;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entities.RideOffer;

public interface RideOfferRepo extends JpaRepository<RideOffer, Long>{
	

}
