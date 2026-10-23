package com.fincore.core_banking_services.customer;

import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.account.AccountResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/customer-portal")
public class CustomerPortalController {
    private final CustomerRepository customers;
    private final AccountRepository accounts;
    public CustomerPortalController(CustomerRepository customers, AccountRepository accounts) {
        this.customers = customers;
        this.accounts = accounts;
    }

    @GetMapping("/me")
    public PortalResponse me(Authentication authentication) {
        Customer customer = customers.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        List<AccountResponse> ownAccounts = customer.getKycStatus() == KycStatus.VERIFIED
                ? accounts.findByCustomer_Id(customer.getId()).stream()
                    .map(a -> new AccountResponse(a.getId(), a.getAccountNumber(), a.getBalance())).toList()
                : List.of();
        return new PortalResponse(customer.getId(), customer.getName(), customer.getEmail(),
                customer.getKycStatus(), ownAccounts);
    }

    public record PortalResponse(java.util.UUID customerId, String name, String email,
                                 KycStatus kycStatus, List<AccountResponse> accounts) {}
}
