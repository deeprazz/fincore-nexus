package com.fincore.api_gateway.proxy;

import com.fincore.api_gateway.ratelimit.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@RestController
public class GatewayProxyController {

    private static final Logger log = LoggerFactory.getLogger(GatewayProxyController.class);

    private final RateLimiterService rateLimiterService;
    private final HttpClient httpClient;

    @Value("${gateway.routes.core:http://localhost:8081}")
    private String coreUrl;

    @Value("${gateway.routes.loan:http://localhost:8082}")
    private String loanUrl;

    @Value("${gateway.routes.payment:http://localhost:8083}")
    private String paymentUrl;

    @Value("${gateway.routes.kyc:http://localhost:8084}")
    private String kycUrl;

    @Value("${gateway.routes.notification:http://localhost:8085}")
    private String notificationUrl;

    public GatewayProxyController(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    @RequestMapping("/api/**")
    public void proxy(HttpServletRequest request, HttpServletResponse response) throws Exception {
        String clientIp = getClientIdentifier(request);
        if (!rateLimiterService.isAllowed(clientIp)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", "60");
            response.getWriter().write("{\"error\": \"Rate limit exceeded. Try again later.\"}");
            return;
        }

        String path = request.getRequestURI();
        String queryString = request.getQueryString();
        String targetHost = resolveTargetHost(path);
        String targetUrlString = targetHost + path + (queryString != null ? "?" + queryString : "");

        log.debug("Proxying {} {} -> {}", request.getMethod(), path, targetUrlString);

        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(targetUrlString))
                .timeout(Duration.ofSeconds(30));

        // Copy incoming headers
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            if ("host".equalsIgnoreCase(name) || "content-length".equalsIgnoreCase(name) || "connection".equalsIgnoreCase(name)) {
                continue;
            }
            Enumeration<String> values = request.getHeaders(name);
            while (values.hasMoreElements()) {
                reqBuilder.header(name, values.nextElement());
            }
        }

        // Handle method and body
        boolean hasBody = "POST".equalsIgnoreCase(request.getMethod())
                || "PUT".equalsIgnoreCase(request.getMethod())
                || "PATCH".equalsIgnoreCase(request.getMethod());

        if (hasBody) {
            byte[] bodyBytes = request.getInputStream().readAllBytes();
            reqBuilder.method(request.getMethod(), HttpRequest.BodyPublishers.ofByteArray(bodyBytes));
        } else if ("DELETE".equalsIgnoreCase(request.getMethod())) {
            reqBuilder.DELETE();
        } else {
            reqBuilder.GET();
        }

        try {
            HttpResponse<InputStream> targetResponse = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofInputStream());
            response.setStatus(targetResponse.statusCode());

            // Copy response headers (skip hop-by-hop and downstream CORS headers managed by Gateway CorsFilter)
            targetResponse.headers().map().forEach((headerName, values) -> {
                String lower = headerName.toLowerCase(Locale.ROOT);
                if ("transfer-encoding".equals(lower)
                        || "content-length".equals(lower)
                        || "connection".equals(lower)
                        || lower.startsWith("access-control-")) {
                    return;
                }
                for (String val : values) {
                    response.addHeader(headerName, val);
                }
            });

            try (InputStream in = targetResponse.body(); OutputStream out = response.getOutputStream()) {
                in.transferTo(out);
                out.flush();
            }
        } catch (Exception e) {
            String targetService = path.startsWith("/api/loans")
                    ? "Loan Management Service (Port 8082)"
                    : path.startsWith("/api/payments") || path.startsWith("/api/beneficiaries") || path.startsWith("/api/settlement")
                    ? "Payment Orchestration Service (Port 8083)"
                    : path.startsWith("/api/kyc") || path.startsWith("/api/compliance")
                    ? "KYC & Compliance Service (Port 8084)"
                    : path.startsWith("/api/notifications")
                    ? "Notification Service (Port 8085)"
                    : "Core Banking Service (Port 8081)";

            String detail = e.getMessage() != null && !e.getMessage().isBlank() ? e.getMessage() : e.getClass().getSimpleName();
            String errorMsg = targetService + " is currently offline or unreachable (" + detail + "). Please make sure the service is running on " + targetHost + ".";
            log.error("Proxy error forwarding {} {} -> {}: {}", request.getMethod(), path, targetUrlString, detail);
            response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"" + errorMsg.replace("\"", "\\\"") + "\"}");
        }
    }

    private String resolveTargetHost(String path) {
        if (path.startsWith("/api/loans")) {
            return loanUrl;
        } else if (path.startsWith("/api/payments") || path.startsWith("/api/beneficiaries") || path.startsWith("/api/settlement")) {
            return paymentUrl;
        } else if (path.startsWith("/api/kyc") || path.startsWith("/api/compliance")) {
            return kycUrl;
        } else if (path.startsWith("/api/notifications")) {
            return notificationUrl;
        } else {
            return coreUrl;
        }
    }

    private String getClientIdentifier(HttpServletRequest request) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && !auth.isBlank()) {
            return "user:" + auth.hashCode();
        }
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
