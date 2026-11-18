package com.fincore.loan_service;

import com.fincore.loan_service.client.CoreBankingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class LoanSecurityRbacTest {

    @Autowired
    private WebApplicationContext context;

    @MockitoBean
    private CoreBankingClient coreBankingClient;

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

    @Test
    void tellerCanCalculateEmiButBlockedFromApprovalAndPortfolio() throws Exception {
        UUID appId = UUID.randomUUID();

        // Teller CAN access EMI calculation
        mockMvc.perform(post("/api/loans/emi/calculate")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("teller", "Teller@123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"principal\":100000,\"annualRate\":0.10,\"tenureMonths\":12}"))
                .andExpect(status().isOk());

        // Teller BLOCKED from loan approval (403)
        mockMvc.perform(patch("/api/loans/applications/" + appId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("teller", "Teller@123")))
                .andExpect(status().isForbidden());

        // Teller BLOCKED from loan rejection (403)
        mockMvc.perform(patch("/api/loans/applications/" + appId + "/reject")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("teller", "Teller@123")))
                .andExpect(status().isForbidden());

        // Teller BLOCKED from portfolio analytics (403)
        mockMvc.perform(get("/api/loans/portfolio")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("teller", "Teller@123")))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCanAccessPortfolio() throws Exception {
        // Manager CAN access portfolio (200)
        mockMvc.perform(get("/api/loans/portfolio")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("manager", "Manager@123")))
                .andExpect(status().isOk());
    }

    @Test
    void customerCanCalculateEmiAndIsBlockedFromStaffEndpoints() throws Exception {
        when(coreBankingClient.validateCredentials("customer@fincore.com", "Password@123")).thenReturn(true);

        // Customer CAN calculate EMI
        mockMvc.perform(post("/api/loans/emi/calculate")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("customer@fincore.com", "Password@123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"principal\":50000,\"annualRate\":0.085,\"tenureMonths\":24}"))
                .andExpect(status().isOk());

        // Customer BLOCKED from portfolio analytics (403)
        mockMvc.perform(get("/api/loans/portfolio")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("customer@fincore.com", "Password@123")))
                .andExpect(status().isForbidden());
    }

    @Test
    void makerCannotApproveOwnLoanApplication() throws Exception {
        when(coreBankingClient.getCustomerKycStatus(any())).thenReturn("VERIFIED");

        String submitJson = """
            {
                "customerId": "85b4fa72-8b12-4438-8b92-2c5786fdaccc",
                "requestedAmount": 50000.00,
                "tenureMonths": 12,
                "purpose": "Personal",
                "annualIncome": 600000.00,
                "employmentType": "SALARIED",
                "existingObligations": 0
            }
        """;

        String res = mockMvc.perform(post("/api/loans/applications")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("manager", "Manager@123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(submitJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(res);
        String appId = node.get("id").asText();

        // Manager attempts to self-approve -> BLOCKED with 403 Forbidden
        mockMvc.perform(patch("/api/loans/applications/" + appId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("manager", "Manager@123")))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedGetsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/loans"))
                .andExpect(status().isUnauthorized());
    }
}
