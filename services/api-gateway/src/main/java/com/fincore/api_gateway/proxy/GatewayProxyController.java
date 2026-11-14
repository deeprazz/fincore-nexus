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
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.*;

@RestController
public class GatewayProxyController {

    private static final Logger log = LoggerFactory.getLogger(GatewayProxyController.class);

    private final RateLimiterService rateLimiterService;

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

        URL targetUrl = URI.create(targetUrlString).toURL();
        HttpURLConnection connection = (HttpURLConnection) targetUrl.openConnection();
        connection.setRequestMethod(request.getMethod());
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(30000);
        connection.setInstanceFollowRedirects(false);

        // Copy incoming headers
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            if ("host".equalsIgnoreCase(name) || "content-length".equalsIgnoreCase(name)) {
                continue;
            }
            Enumeration<String> values = request.getHeaders(name);
            while (values.hasMoreElements()) {
                connection.addRequestProperty(name, values.nextElement());
            }
        }

        // Copy body if present
        boolean hasBody = "POST".equalsIgnoreCase(request.getMethod())
                || "PUT".equalsIgnoreCase(request.getMethod())
                || "PATCH".equalsIgnoreCase(request.getMethod());

        if (hasBody) {
            connection.setDoOutput(true);
            try (InputStream in = request.getInputStream(); OutputStream out = connection.getOutputStream()) {
                in.transferTo(out);
                out.flush();
            }
        }

        // Handle target response
        int statusCode = connection.getResponseCode();
        response.setStatus(statusCode);

        // Copy response headers
        for (Map.Entry<String, List<String>> entry : connection.getHeaderFields().entrySet()) {
            String headerName = entry.getKey();
            if (headerName == null || "transfer-encoding".equalsIgnoreCase(headerName)) {
                continue;
            }
            for (String val : entry.getValue()) {
                response.addHeader(headerName, val);
            }
        }

        // Stream response body back
        InputStream responseStream = (statusCode >= 400) ? connection.getErrorStream() : connection.getInputStream();
        if (responseStream != null) {
            try (InputStream in = responseStream; OutputStream out = response.getOutputStream()) {
                in.transferTo(out);
                out.flush();
            }
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
