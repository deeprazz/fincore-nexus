
package com.fincore.core_banking_services.customer;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "http://localhost:5173")
public class CustomerController {

    private final CustomerService service;

    public CustomerController(CustomerService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse create(
            @Valid @RequestBody CreateCustomerRequest req) {
        return service.create(req);
    }

    @GetMapping("/{id}")
    public CustomerResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @GetMapping
    public List<CustomerResponse> list() {
        return service.list();
    }

    @PatchMapping("/{id}/kyc")
    public CustomerResponse updateKyc(
            @PathVariable UUID id,
            @RequestParam KycStatus status) {
        return service.updateKycStatus(id, status);
    }
}
