package com.fincore.core_banking_services.customer;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import com.fincore.core_banking_services.customer.Customer;
import com.fincore.core_banking_services.customer.CustomerRepository;
import com.fincore.core_banking_services.account.AccountStatus;
import java.util.UUID;
@Entity
@Table(name = "customer")
public class Customer {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false)
    private KycStatus kycStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Customer() { }   // required by JPA

    public Customer(String name, String email) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.email = email;
        this.kycStatus = KycStatus.PENDING;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public KycStatus getKycStatus() { return kycStatus; }
    public Instant getCreatedAt() { return createdAt; }
}
