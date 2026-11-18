package com.fincore.payment_service.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class CoreBankingClient {

    private static final Logger log = LoggerFactory.getLogger(CoreBankingClient.class);

    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String credentials;

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
     * Debit an account in core banking.
     */
    public boolean debitAccount(UUID accountId, BigDecimal amount, String description) {
        return debitAccount(accountId, amount, description, null);
    }

    public boolean debitAccount(UUID accountId, BigDecimal amount, String description, UUID referenceId) {
        try {
            Map<String, Object> bodyMap = new HashMap<>();
            bodyMap.put("amount", amount);
            bodyMap.put("description", description);
            if (referenceId != null) {
                bodyMap.put("referenceId", referenceId.toString());
            }
            String body = objectMapper.writeValueAsString(bodyMap);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/accounts/" + accountId + "/withdraw"))
                    .header("Authorization", "Basic " + credentials)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.error("Failed to debit account {}: {}", accountId, e.getMessage());
            return false;
        }
    }

    /**
     * Credit an account in core banking.
     */
    public boolean creditAccount(UUID accountId, BigDecimal amount, String description) {
        return creditAccount(accountId, amount, description, null);
    }

    public boolean creditAccount(UUID accountId, BigDecimal amount, String description, UUID referenceId) {
        try {
            Map<String, Object> bodyMap = new HashMap<>();
            bodyMap.put("amount", amount);
            bodyMap.put("description", description);
            if (referenceId != null) {
                bodyMap.put("referenceId", referenceId.toString());
            }
            String body = objectMapper.writeValueAsString(bodyMap);

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
     * Retrieve all core banking transactions for ledger reconciliation.
     */
    public java.util.List<CoreTransactionDto> getAllTransactions() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/transactions"))
                    .header("Authorization", "Basic " + credentials)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return objectMapper.readValue(
                        response.body(),
                        objectMapper.getTypeFactory().constructCollectionType(java.util.List.class, CoreTransactionDto.class)
                );
            }
            log.error("Failed to fetch core transactions: status {}", response.statusCode());
            return java.util.List.of();
        } catch (Exception e) {
            log.error("Exception fetching core transactions: {}", e.getMessage());
            return java.util.List.of();
        }
    }

    /**
     * Retrieve core banking transactions by referenceId.
     */
    public java.util.List<CoreTransactionDto> getTransactionsByReference(UUID referenceId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/transactions/reference/" + referenceId))
                    .header("Authorization", "Basic " + credentials)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return objectMapper.readValue(
                        response.body(),
                        objectMapper.getTypeFactory().constructCollectionType(java.util.List.class, CoreTransactionDto.class)
                );
            }
            return java.util.List.of();
        } catch (Exception e) {
            log.error("Exception fetching core transactions by reference: {}", e.getMessage());
            return java.util.List.of();
        }
    }

    /**
     * Check account details.
     */
    public JsonNode getAccount(UUID accountId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/accounts/" + accountId))
                    .header("Authorization", "Basic " + credentials)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return objectMapper.readTree(response.body());
            }
            return null;
        } catch (Exception e) {
            log.warn("Failed to fetch account {}: {}", accountId, e.getMessage());
            return null;
        }
    }
}
