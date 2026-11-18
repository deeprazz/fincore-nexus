package com.fincore.core_banking_services.customer;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
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
    public CustomerResponse updateKycPatch(
            @PathVariable UUID id,
            @RequestParam KycStatus status) {
        return service.updateKycStatus(id, status);
    }

    @PutMapping("/{id}/kyc")
    public CustomerResponse updateKycPut(
            @PathVariable UUID id,
            @RequestParam KycStatus status) {
        return service.updateKycStatus(id, status);
    }

    @PostMapping("/{id}/kyc")
    public CustomerResponse updateKycPost(
            @PathVariable UUID id,
            @RequestParam KycStatus status) {
        return service.updateKycStatus(id, status);
    }

    @PutMapping("/{id}")
    public CustomerResponse updateCustomerPut(
            @PathVariable UUID id,
            @RequestParam(required = false) KycStatus status) {
        if (status != null) {
            return service.updateKycStatus(id, status);
        }
        return service.get(id);
    }
}
