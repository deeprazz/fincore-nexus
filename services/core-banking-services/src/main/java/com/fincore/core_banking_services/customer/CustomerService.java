package com.fincore.core_banking_services.customer;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CustomerService {

    private final CustomerRepository repo;   // injected by Spring

    public CustomerService(CustomerRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public CustomerResponse create(CreateCustomerRequest req) {
        if (repo.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        return CustomerResponse.from(repo.save(new Customer(req.name(), req.email())));
    }

    @Transactional(readOnly = true)
    public CustomerResponse get(UUID id) {
        return repo.findById(id)
                .map(CustomerResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> list() {
        return repo.findAll().stream().map(CustomerResponse::from).toList();
    }
}
