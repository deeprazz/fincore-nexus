package com.fincore.core_banking_services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.core_banking_services.account.Account;
import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.approval.PendingApproval;
import com.fincore.core_banking_services.approval.PendingApprovalRepository;
import com.fincore.core_banking_services.customer.Customer;
import com.fincore.core_banking_services.customer.CustomerRepository;
import com.fincore.core_banking_services.customer.KycStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class MakerCheckerApprovalTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PendingApprovalRepository pendingApprovalRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    private String basicAuth(String username, String password) {
        String auth = username + ":" + password;
        return "Basic " + Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
    }

    private Account createTestAccount(String email, BigDecimal initialBalance) {
        Customer customer = customerRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            Customer c = new Customer("Test " + email, email);
            c.updateKycStatus(KycStatus.VERIFIED);
            return customerRepository.save(c);
        });

        Account a = new Account();
        a.setCustomer(customer);
        a.setAccountNumber("ACC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        a.setBalance(initialBalance);
        a.setStatus(com.fincore.core_banking_services.account.AccountStatus.ACTIVE);
        return accountRepository.save(a);
    }

    @Test
    void largeTransferTriggersPendingApprovalAndRequiresDifferentChecker() throws Exception {
        Account fromAccount = createTestAccount("maker1@fincore.com", new BigDecimal("500000.00"));
        Account toAccount = createTestAccount("receiver1@fincore.com", new BigDecimal("10000.00"));

        BigDecimal transferAmount = new BigDecimal("250000.00"); // Above default 200,000 threshold

        String transferJson = """
            {
                "fromAccountId": "%s",
                "toAccountId": "%s",
                "amount": 250000.00
            }
        """.formatted(fromAccount.getId(), toAccount.getId());

        // 1. Manager initiates transfer (maker = "manager")
        String res = mockMvc.perform(post("/api/accounts/transfer")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("manager", "Manager@123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferJson))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();

        JsonNode responseNode = objectMapper.readTree(res);
        assertEquals("PENDING_APPROVAL", responseNode.get("status").asText());
        UUID approvalId = UUID.fromString(responseNode.get("approvalId").asText());

        // Assert balances are UNCHANGED before approval
        Account fromAfterReq = accountRepository.findById(fromAccount.getId()).orElseThrow();
        Account toAfterReq = accountRepository.findById(toAccount.getId()).orElseThrow();
        assertEquals(0, fromAfterReq.getBalance().compareTo(new BigDecimal("500000.00")));
        assertEquals(0, toAfterReq.getBalance().compareTo(new BigDecimal("10000.00")));

        // 2. Self-approval blocked: The same manager (maker) attempts to approve -> 403 Forbidden
        mockMvc.perform(post("/api/approvals/" + approvalId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("manager", "Manager@123")))
                .andExpect(status().isForbidden());

        // Assert balances still UNCHANGED
        fromAfterReq = accountRepository.findById(fromAccount.getId()).orElseThrow();
        assertEquals(0, fromAfterReq.getBalance().compareTo(new BigDecimal("500000.00")));

        // 3. Different authorized checker (admin) approves the transaction -> 200 OK
        mockMvc.perform(post("/api/approvals/" + approvalId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("admin", "Admin@123")))
                .andExpect(status().isOk());

        // Assert balances are now moved in the same transaction
        Account fromAfterApprove = accountRepository.findById(fromAccount.getId()).orElseThrow();
        Account toAfterApprove = accountRepository.findById(toAccount.getId()).orElseThrow();
        assertEquals(0, fromAfterApprove.getBalance().compareTo(new BigDecimal("250000.00")));
        assertEquals(0, toAfterApprove.getBalance().compareTo(new BigDecimal("260000.00")));

        // Assert pending approval record is APPROVED
        PendingApproval record = pendingApprovalRepository.findById(approvalId).orElseThrow();
        assertEquals("APPROVED", record.getStatus());
        assertEquals("admin", record.getChecker());
    }

    @Test
    void largeTransactionRejectionLeavesBalancesUnchanged() throws Exception {
        Account fromAccount = createTestAccount("maker2@fincore.com", new BigDecimal("300000.00"));
        Account toAccount = createTestAccount("receiver2@fincore.com", new BigDecimal("5000.00"));

        String transferJson = """
            {
                "fromAccountId": "%s",
                "toAccountId": "%s",
                "amount": 220000.00
            }
        """.formatted(fromAccount.getId(), toAccount.getId());

        // 1. Teller initiates transfer (maker = "teller")
        String res = mockMvc.perform(post("/api/accounts/transfer")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("teller", "Teller@123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferJson))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();

        UUID approvalId = UUID.fromString(objectMapper.readTree(res).get("approvalId").asText());

        // 2. Manager rejects the transaction
        mockMvc.perform(post("/api/approvals/" + approvalId + "/reject")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("manager", "Manager@123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\": \"Suspicious transaction volume\"}"))
                .andExpect(status().isOk());

        // 3. Assert balances remain completely unchanged
        Account fromAfterReject = accountRepository.findById(fromAccount.getId()).orElseThrow();
        Account toAfterReject = accountRepository.findById(toAccount.getId()).orElseThrow();
        assertEquals(0, fromAfterReject.getBalance().compareTo(new BigDecimal("300000.00")));
        assertEquals(0, toAfterReject.getBalance().compareTo(new BigDecimal("5000.00")));

        PendingApproval record = pendingApprovalRepository.findById(approvalId).orElseThrow();
        assertEquals("REJECTED", record.getStatus());
        assertEquals("manager", record.getChecker());
    }
}
