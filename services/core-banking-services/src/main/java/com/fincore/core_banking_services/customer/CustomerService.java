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
    private final com.fincore.core_banking_services.audit.AuditService auditService;

    @PersistenceContext
    private EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Autowired
    public CustomerService(CustomerRepository repo, PasswordEncoder passwordEncoder, com.fincore.core_banking_services.audit.AuditService auditService) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public CustomerService(CustomerRepository repo, PasswordEncoder passwordEncoder) {
        this(repo, passwordEncoder, null);
    }

    /** Public self-registration always creates a CUSTOMER with KYC pending. */
    @Transactional
    public CustomerResponse selfRegister(String name, String email, String rawPassword, String phoneNumber, String aadhaarNumber, String panNumber) {
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
                normalizedName,
                normalizedEmail,
                passwordEncoder.encode(rawPassword),
                phoneNumber != null ? phoneNumber.trim() : null,
                aadhaarNumber != null ? aadhaarNumber.trim() : null,
                panNumber != null ? panNumber.trim().toUpperCase(java.util.Locale.ROOT) : null
        ));
        audit("CUSTOMER_SELF_REGISTERED", saved, "self-registration; kycStatus=PENDING");
        return CustomerResponse.from(saved);
    }

    @Transactional
    public CustomerResponse selfRegister(String name, String email, String rawPassword) {
        return selfRegister(name, email, rawPassword, null, null, null);
    }

    private void audit(String action, Customer customer, String details) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String actor = authentication != null && authentication.isAuthenticated()
                ? authentication.getName() : "SYSTEM";
        if (auditService != null) {
            auditService.record(action, "CUSTOMER", customer.getId(), actor, details);
        } else if (entityManager != null) {
            entityManager.persist(new AuditLog(
                    action, "CUSTOMER", customer.getId(), actor, details));
        }
    }

    @Transactional
    public CustomerResponse create(CreateCustomerRequest req) {
        String normalizedEmail = req.email() == null ? "" : req.email().trim().toLowerCase(java.util.Locale.ROOT);
        if (repo.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already registered"
            );
        }

        String passwordHash = (req.password() != null && !req.password().isBlank())
                ? passwordEncoder.encode(req.password())
                : passwordEncoder.encode("Customer@123");

        Customer saved = repo.save(new Customer(
                req.name().trim(),
                normalizedEmail,
                passwordHash,
                req.phoneNumber() != null ? req.phoneNumber().trim() : null,
                req.aadhaarNumber() != null ? req.aadhaarNumber().trim() : null,
                req.panNumber() != null ? req.panNumber().trim().toUpperCase(java.util.Locale.ROOT) : null
        ));
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
