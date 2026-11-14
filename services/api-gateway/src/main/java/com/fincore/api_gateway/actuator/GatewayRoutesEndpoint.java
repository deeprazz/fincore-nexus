package com.fincore.api_gateway.actuator;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@Endpoint(id = "gatewayroutes")
public class GatewayRoutesEndpoint {

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

    @ReadOperation
    public Map<String, Object> routes() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("routes", List.of(
                Map.of("id", "core-banking", "path", "/api/accounts|customers|transactions|audit|dashboard|customer-portal/**", "target", coreUrl),
                Map.of("id", "loan-management", "path", "/api/loans/**", "target", loanUrl),
                Map.of("id", "payment-orchestration", "path", "/api/payments|beneficiaries|settlement/**", "target", paymentUrl),
                Map.of("id", "kyc-compliance", "path", "/api/kyc|compliance/**", "target", kycUrl),
                Map.of("id", "notification-service", "path", "/api/notifications/**", "target", notificationUrl)
        ));
        return result;
    }
}
