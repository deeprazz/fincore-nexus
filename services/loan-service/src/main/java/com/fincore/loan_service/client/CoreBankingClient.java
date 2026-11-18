package com.fincore.loan_service.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.UUID;

/**
 * HTTP client to query core banking service.
 * Uses JDK 11+ HttpClient — no external HTTP library needed.
 */
@Component
public class CoreBankingClient {

    private static final Logger log = LoggerFactory.getLogger(CoreBankingClient.class);

    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String credentials; // Basic Auth: teller/Teller@123

    public CoreBankingClient(
            @Value("${fincore.core-banking.base-url:http://localhost:8081}") String baseUrl,
            @Value("${fincore.security.teller-password:Teller@123}") String tellerPassword,
            ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
        this.credentials = Base64.getEncoder().encodeToString(("teller:" + tellerPassword).getBytes());
    }

    /**
     * Returns the kycStatus of the customer from core banking.
     * Returns "UNKNOWN" if the call fails (graceful degradation).
     */
    public String getCustomerKycStatus(UUID customerId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/customers/" + customerId))
                    .header("Authorization", "Basic " + credentials)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode node = objectMapper.readTree(response.body());
                return node.path("kycStatus").asText("UNKNOWN");
            }
            log.warn("Core banking returned {} for customer {}", response.statusCode(), customerId);
            return "UNKNOWN";
        } catch (Exception e) {
            log.warn("Failed to get KYC status for customer {}: {}", customerId, e.getMessage());
            return "UNKNOWN";
        }
    }

    /**
     * Credit an account in core banking by calling the deposit endpoint.
     * Returns true on success.
     */
    public boolean creditAccount(UUID accountId, java.math.BigDecimal amount, String description) {
        try {
            String body = objectMapper.writeValueAsString(
                    new java.util.HashMap<String, Object>() {{
                        put("amount", amount);
                        put("description", description);
                    }}
            );
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/accounts/" + accountId + "/deposit"))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.error("Failed to credit account {}: {}", accountId, e.getMessage());
            return false;
        }
    }

    /**
     * Validates customer or staff credentials against core banking /api/auth/me.
     * Returns true if core banking returns HTTP 200 OK.
     */
    public boolean validateCredentials(String username, String password) {
        if (username == null || password == null || username.isBlank()) {
            return false;
        }
        try {
            String token = Base64.getEncoder().encodeToString(
                    (username + ":" + password).getBytes(java.nio.charset.StandardCharsets.UTF_8)
            );
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/auth/me"))
                    .header("Authorization", "Basic " + token)
                    .timeout(java.time.Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.warn("Credential validation failed for {}: {}", username, e.getMessage());
            return false;
        }
    }
}
