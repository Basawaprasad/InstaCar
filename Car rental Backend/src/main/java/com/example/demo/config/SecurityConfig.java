package com.example.demo.config;

import com.example.demo.security.JwtRequestFilter;
import com.example.demo.security.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.*;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.firewall.StrictHttpFirewall;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(customUserDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    // Single firewall bean to allow encoded characters in URLs
    @Bean
    public StrictHttpFirewall allowUrlEncodedSlashHttpFirewall() {
        StrictHttpFirewall firewall = new StrictHttpFirewall();
        firewall.setAllowUrlEncodedSlash(true);
        firewall.setAllowUrlEncodedPercent(true);  // optional
        firewall.setAllowUrlEncodedPeriod(true);   // optional
        return firewall;
    }

    // Apply firewall globally
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.httpFirewall(allowUrlEncodedSlashHttpFirewall());
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(withDefaults()) // Enable CORS support in Spring Security, important!
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .authorizeHttpRequests(auth -> auth

                // Public endpoints
                .antMatchers(HttpMethod.POST,"/login" ,"/registeruser", "/authenticate","/verify-otp").permitAll()
                .antMatchers("/getcars/available","/getcars/getallcars", "/getcars/get/**").permitAll()
                .antMatchers("/auth/login", "/registeruser", "/auth/authenticate").permitAll()
                .antMatchers("/getcars/filter").permitAll()
                .antMatchers(HttpMethod.GET, "/getcars/search").permitAll()  
                .antMatchers("/getcars/advanced-filter").permitAll()
                
                // Authenticated users
                .antMatchers(HttpMethod.GET, "/getcars/**").authenticated()

                // Admin-only endpoints
                .antMatchers(HttpMethod.POST, "/getcars/cars").hasRole("ADMIN")
                .antMatchers(HttpMethod.PUT, "/getcars/edit/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.DELETE, "/getcars/deletecar/**").hasRole("ADMIN")
                .antMatchers(HttpMethod.GET, "/users", "/auth/users", "/delete").hasRole("ADMIN")

                .antMatchers(HttpMethod.POST, "/booking/rent/**").hasAnyRole("USER", "ADMIN")
                .antMatchers(HttpMethod.GET, "/booking/user/**").hasAnyRole("USER", "ADMIN")
                .antMatchers(HttpMethod.PUT, "/booking/return/**").hasAnyRole("USER", "ADMIN")
                .antMatchers("/actuator/health", "/actuator/info").permitAll()
             // Allow frontend (React)
                .antMatchers(
                        "/",
                        "/index.html",
                        "/favicon.ico",
                        "/asset-manifest.json",
                        "/manifest.json",
                        "/robots.txt",
                        "/logo*.png",
                        "/images/**",
                        "/static/**",
                        "/**/*.js",
                        "/**/*.css",
                        "/**/*.png",
                        "/**/*.svg"
                ).permitAll()

                // Allow ALL frontend routes (React Router)
                .antMatchers(
                        "/login",
                        "/register",
                        "/dashboard/**",
                        "/profile/**",
                        "/**"
                ).permitAll()
                



                // Any other requests must be authenticated
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Bean to allow use of principal.id in @PreAuthorize expressions
    @Bean
    public MethodSecurityExpressionHandler methodSecurityExpressionHandler() {
        return new DefaultMethodSecurityExpressionHandler();
    }
}
