package com.fincore.core_banking_services.customer;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final CustomerService customers;
    public AuthController(CustomerService customers) { this.customers = customers; }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse register(@Valid @RequestBody CustomerRegistrationRequest request) {
        return customers.selfRegister(request.name(), request.email(), request.password());
    }
}
