package com.fincore.core_banking_services.config;

import com.fincore.core_banking_services.customer.Customer;
import com.fincore.core_banking_services.customer.CustomerRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers("/api/customer-portal/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/**").hasRole("TELLER")
                        .anyRequest().permitAll())
                .httpBasic(Customizer.withDefaults())
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(
            PasswordEncoder encoder,
            CustomerRepository customers) {

        String tellerPasswordHash = encoder.encode("Teller@123");

        return username -> {
            if ("teller".equalsIgnoreCase(username)) {
                // Return a fresh UserDetails object for every authentication.
                return User.withUsername("teller")
                        .password(tellerPasswordHash)
                        .roles("TELLER")
                        .build();
            }

            Customer customer = customers.findByEmailIgnoreCase(username)
                    .filter(c -> c.getPasswordHash() != null)
                    .orElseThrow(() ->
                            new UsernameNotFoundException(
                                    "Invalid username or password"));

            return User.withUsername(customer.getEmail())
                    .password(customer.getPasswordHash())
                    .roles("CUSTOMER")
                    .build();
        };
    }
}
