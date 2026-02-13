package com.example.demo.repos;
import java.util.Optional;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.entities.User;
@Repository
public interface Userrepo extends CrudRepository<User, Long>{

	Optional<User> findByEmail(String email);

	Optional<User> findByDrivingLicenseNumber(String drivingLicenseNumber);

	Optional<User> findById(Long id);

	void deleteById(Long id);

	

}
