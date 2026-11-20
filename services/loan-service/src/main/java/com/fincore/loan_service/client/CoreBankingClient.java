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

    public record DebitResult(boolean success, String errorMessage) {}

    public record CustomerDto(
            UUID id,
            String name,
            String email,
            String phoneNumber,
            String kycStatus,
            String panNumber,
            String aadhaarNumber
    ) {}

    /**
     * Look up full customer details by customer ID from core banking.
     */
    public CustomerDto getCustomer(UUID customerId) {
        if (customerId == null) return null;
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/customers/" + customerId))
                    .header("Authorization", "Basic " + credentials)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode n = objectMapper.readTree(response.body());
                return new CustomerDto(
                        customerId,
                        n.path("name").asText(null),
                        n.path("email").asText(null),
                        n.path("phoneNumber").asText(null),
                        n.path("kycStatus").asText("UNKNOWN"),
                        n.path("panNumber").asText(null),
                        n.path("aadhaarNumber").asText(null)
                );
            }
            log.warn("Core banking returned status {} for customer {}", response.statusCode(), customerId);
        } catch (Exception e) {
            log.warn("Failed to get customer {}: {}", customerId, e.getMessage());
        }
        return null;
    }

    /**
     * Find the first active bank account for a customer from core banking.
     */
    public UUID getCustomerFirstActiveAccountId(UUID customerId) {
        if (customerId == null) return null;
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/accounts/customer/" + customerId))
                    .header("Authorization", "Basic " + credentials)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode array = objectMapper.readTree(response.body());
                if (array.isArray() && array.size() > 0) {
                    return UUID.fromString(array.get(0).get("id").asText());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to find account for customer {}: {}", customerId, e.getMessage());
        }
        return null;
    }

    /**
     * Debit an account in core banking by calling the withdraw endpoint.
     * Returns DebitResult with success=true, or success=false and the error message (e.g. Insufficient balance).
     */
    public DebitResult debitAccount(UUID accountId, java.math.BigDecimal amount, String description) {
        if (accountId == null) {
            return new DebitResult(false, "Account ID is required for withdrawal");
        }
        try {
            String body = objectMapper.writeValueAsString(
                    new java.util.HashMap<String, Object>() {{
                        put("amount", amount);
                        put("description", description);
                    }}
            );
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/accounts/" + accountId + "/withdraw"))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return new DebitResult(true, null);
            }
            String errorMsg = "Account withdrawal failed with status " + response.statusCode();
            try {
                JsonNode n = objectMapper.readTree(response.body());
                if (n.has("message") && !n.get("message").asText().isBlank()) {
                    errorMsg = n.get("message").asText();
                } else if (n.has("error") && !n.get("error").asText().isBlank()) {
                    errorMsg = n.get("error").asText();
                }
            } catch (Exception ignored) {}
            return new DebitResult(false, errorMsg);
        } catch (Exception e) {
            log.error("Failed to debit account {}: {}", accountId, e.getMessage());
            return new DebitResult(false, "Connection to core banking failed: " + e.getMessage());
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
