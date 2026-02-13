package com.example.demo.services;
import java.util.List;
import java.util.Optional;
import javax.validation.Valid;
import org.springframework.http.ResponseEntity;
import com.example.demo.entities.User;



public interface Userser {

	User saveUser(@Valid User user);

	Optional<User> getUserByEmail(String email);

	boolean checkPassword(String password, User user);

	List<User> getAllUsers();


	void registerUser(@Valid User user);

	void verifyOtp(String email, String otp);

	

	Optional<User> getUserById(Long id);



	ResponseEntity<?> assignCarToUser(Long userid, Long carid);

	void deleteUser(Long id);

	ResponseEntity<?> removeCarFromUser(Long userid);



	
	

}
