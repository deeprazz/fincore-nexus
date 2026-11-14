package com.fincore.core_banking_services.customer;

import java.util.List;

public record AuthMeResponse(
        String username,
        String role,
        List<String> roles
) {}
