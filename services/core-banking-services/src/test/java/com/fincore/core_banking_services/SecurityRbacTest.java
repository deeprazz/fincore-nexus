package com.fincore.core_banking_services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class SecurityRbacTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserDetailsService userDetailsService;

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
    void userDetailsServiceLoadsRolesCorrectly() {
        UserDetails teller = userDetailsService.loadUserByUsername("teller");
        assertTrue(teller.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TELLER")));

        UserDetails manager = userDetailsService.loadUserByUsername("manager");
        assertTrue(manager.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")));

        UserDetails admin = userDetailsService.loadUserByUsername("admin");
        assertTrue(admin.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void tellerCanAccessOperationsAndAudit() throws Exception {
        // Teller CAN view accounts
        mockMvc.perform(get("/api/accounts")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("teller", "Teller@123")))
                .andExpect(status().isOk());

        // Teller CAN view audit (all-in-one staff access)
        mockMvc.perform(get("/api/audit")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("teller", "Teller@123")))
                .andExpect(status().isOk());
    }

    @Test
    void managerCanViewAuditAndAccounts() throws Exception {
        // Manager CAN view audit
        mockMvc.perform(get("/api/audit")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("manager", "Manager@123")))
                .andExpect(status().isOk());

        // Manager CAN view accounts
        mockMvc.perform(get("/api/accounts")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("manager", "Manager@123")))
                .andExpect(status().isOk());
    }

    @Test
    void adminCanAccessAuditAndAccounts() throws Exception {
        // Admin CAN view audit
        mockMvc.perform(get("/api/audit")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("admin", "Admin@123")))
                .andExpect(status().isOk());

        // Admin CAN view accounts
        mockMvc.perform(get("/api/accounts")
                .header(HttpHeaders.AUTHORIZATION, basicAuth("admin", "Admin@123")))
                .andExpect(status().isOk());
    }
}
