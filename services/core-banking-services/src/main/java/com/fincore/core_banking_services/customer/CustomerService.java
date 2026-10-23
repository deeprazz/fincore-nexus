package com.fincore.core_banking_services.customer;

import com.fincore.core_banking_services.audit.AuditLog;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CustomerService {

    private final CustomerRepository repo;
    private final PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    public CustomerService(CustomerRepository repo, PasswordEncoder passwordEncoder) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
    }

    /** Public self-registration always creates a CUSTOMER with KYC pending. */
    @Transactional
    public CustomerResponse selfRegister(String name, String email, String rawPassword) {
        String normalizedName = name == null ? "" : name.trim();
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT);

        if (normalizedName.isBlank() || normalizedEmail.isBlank()
                || rawPassword == null || rawPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Name, valid email, and a password of at least 8 characters are required");
        }
        if (repo.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        Customer saved = repo.save(new Customer(
                normalizedName, normalizedEmail, passwordEncoder.encode(rawPassword)));
        audit("CUSTOMER_SELF_REGISTERED", saved, "self-registration; kycStatus=PENDING");
        return CustomerResponse.from(saved);
    }

    private void audit(String action, Customer customer, String details) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String actor = authentication != null && authentication.isAuthenticated()
                ? authentication.getName() : "SYSTEM";
        entityManager.persist(new AuditLog(
                action, "CUSTOMER", customer.getId(), actor, details));
    }

    @Transactional
    public CustomerResponse create(CreateCustomerRequest req) {
        if (repo.existsByEmail(req.email())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already registered"
            );
        }

        Customer saved = repo.save(new Customer(req.name(), req.email()));
        audit("CUSTOMER_CREATED", saved,
                "customer created; kycStatus=" + saved.getKycStatus());
        return CustomerResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public CustomerResponse get(UUID id) {
        return repo.findById(id)
                .map(CustomerResponse::from)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Customer not found"
                ));
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> list() {
        return repo.findAll()
                .stream()
                .map(CustomerResponse::from)
                .toList();
    }

    @Transactional
    public CustomerResponse updateKycStatus(UUID id, KycStatus status) {
        if (status == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "KYC status is required"
            );
        }

        if (status != KycStatus.VERIFIED && status != KycStatus.REJECTED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "KYC status must be VERIFIED or REJECTED"
            );
        }

        Customer customer = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Customer not found"
                ));

        KycStatus previousStatus = customer.getKycStatus();
        customer.updateKycStatus(status);
        Customer saved = repo.save(customer);
        audit("KYC_STATUS_CHANGED", saved,
                "from=" + previousStatus + "; to=" + status);
        return CustomerResponse.from(saved);
    }
}
