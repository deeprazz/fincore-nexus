package com.fincore.core_banking_services.customer;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final CustomerService customers;
    public AuthController(CustomerService customers) { this.customers = customers; }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse register(@Valid @RequestBody CustomerRegistrationRequest request) {
        return customers.selfRegister(
                request.name(),
                request.email(),
                request.password(),
                request.phoneNumber(),
                request.aadhaarNumber(),
                request.panNumber()
        );
    }

    @GetMapping("/me")
    public AuthMeResponse me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        String primaryRole = "CUSTOMER";
        if (roles.contains("ROLE_ADMIN")) {
            primaryRole = "ADMIN";
        } else if (roles.contains("ROLE_MANAGER")) {
            primaryRole = "MANAGER";
        } else if (roles.contains("ROLE_TELLER")) {
            primaryRole = "TELLER";
        }

        return new AuthMeResponse(authentication.getName(), primaryRole, roles);
    }
}
