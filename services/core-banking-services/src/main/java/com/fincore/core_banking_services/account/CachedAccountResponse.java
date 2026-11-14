package com.fincore.core_banking_services.account;

public record CachedAccountResponse(
        AccountResponse response,
        boolean cacheHit
) {}
