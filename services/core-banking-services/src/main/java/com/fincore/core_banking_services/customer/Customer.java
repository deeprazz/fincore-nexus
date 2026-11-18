package com.fincore.core_banking_services.customer;

import jakarta.persistence.*;
import java.time.Instant;
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

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "aadhaar_number")
    private String aadhaarNumber;

    @Column(name = "pan_number")
    private String panNumber;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "transaction_pin_hash")
    private String transactionPinHash;

    @Column(name = "failed_pin_attempts", nullable = false)
    private int failedPinAttempts = 0;

    @Column(name = "pin_locked_until")
    private Instant pinLockedUntil;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false)
    private KycStatus kycStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Customer() {
    }

    public Customer(String name, String email) {
        this(name, email, null, null, null, null);
    }

    public Customer(String name, String email, String passwordHash) {
        this(name, email, passwordHash, null, null, null);
    }

    public Customer(String name, String email, String passwordHash, String phoneNumber, String aadhaarNumber, String panNumber) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.phoneNumber = phoneNumber;
        this.aadhaarNumber = aadhaarNumber;
        this.panNumber = panNumber;
        this.kycStatus = KycStatus.PENDING;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getAadhaarNumber() {
        return aadhaarNumber;
    }

    public void setAadhaarNumber(String aadhaarNumber) {
        this.aadhaarNumber = aadhaarNumber;
    }

    public String getPanNumber() {
        return panNumber;
    }

    public void setPanNumber(String panNumber) {
        this.panNumber = panNumber;
    }

    public String getPasswordHash() { return passwordHash; }

    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getTransactionPinHash() { return transactionPinHash; }

    public boolean hasTransactionPin() { return transactionPinHash != null && !transactionPinHash.isBlank(); }

    public void setTransactionPinHash(String transactionPinHash) { this.transactionPinHash = transactionPinHash; }

    public int getFailedPinAttempts() { return failedPinAttempts; }

    public void setFailedPinAttempts(int failedPinAttempts) { this.failedPinAttempts = failedPinAttempts; }

    public Instant getPinLockedUntil() { return pinLockedUntil; }

    public void setPinLockedUntil(Instant pinLockedUntil) { this.pinLockedUntil = pinLockedUntil; }

    public boolean isPinLocked() {
        return pinLockedUntil != null && pinLockedUntil.isAfter(Instant.now());
    }

    public void registerFailedPinAttempt() {
        this.failedPinAttempts++;
        if (this.failedPinAttempts >= 5) {
            this.pinLockedUntil = Instant.now().plusSeconds(15 * 60);
        }
    }

    public void resetPinAttempts() {
        this.failedPinAttempts = 0;
        this.pinLockedUntil = null;
    }

    public KycStatus getKycStatus() {
        return kycStatus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void updateKycStatus(KycStatus kycStatus) {
        this.kycStatus = kycStatus;
    }
}
