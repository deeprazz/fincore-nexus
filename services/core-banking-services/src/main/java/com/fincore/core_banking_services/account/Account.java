package com.fincore.core_banking_services.account;
import com.fincore.core_banking_services.customer.Customer;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="account")
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID   id;
    public UUID getId() {
        return id;
    }

    @Column(name = "account_number", nullable = false, unique = true, length = 30)
    private String accountNumber;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountStatus status;



    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "created_at",nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at",nullable = false)
    private OffsetDateTime updatedAt;


    public Account(){

    }
    // getter for balance
    public BigDecimal getBalance(){
        return balance;
    }

    // setter for balance
    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    // getter for account number
    public String getAccountNumber(){
        return accountNumber;
    }

    // setter for account number
    public void  setAccountNumber(String accountNumber){
        this.accountNumber = accountNumber;
    }

    // getter and setter for customer
    public Customer getCustomer(){
        return customer;
    }

    public void setCustomer(Customer customer){
        this.customer = customer;
    }
    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

}
