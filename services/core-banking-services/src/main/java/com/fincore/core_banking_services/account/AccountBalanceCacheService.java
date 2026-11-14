package com.fincore.core_banking_services.account;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccountBalanceCacheService {

    private static final Logger log = LoggerFactory.getLogger(AccountBalanceCacheService.class);
    private static final String KEY_PREFIX = "account:balance:";
    private static final Duration TTL = Duration.ofSeconds(60);

    private final StringRedisTemplate redisTemplate;

    public AccountBalanceCacheService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Optional<BigDecimal> getCachedBalance(UUID accountId) {
        if (redisTemplate == null || accountId == null) {
            return Optional.empty();
        }
        try {
            String val = redisTemplate.opsForValue().get(KEY_PREFIX + accountId);
            if (val != null && !val.isBlank()) {
                return Optional.of(new BigDecimal(val));
            }
        } catch (Exception e) {
            log.warn("Redis read failed for account {}: {}", accountId, e.getMessage());
        }
        return Optional.empty();
    }

    public void cacheBalance(UUID accountId, BigDecimal balance) {
        if (redisTemplate == null || accountId == null || balance == null) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + accountId, balance.toPlainString(), TTL);
        } catch (Exception e) {
            log.warn("Redis write failed for account {}: {}", accountId, e.getMessage());
        }
    }

    public void evictBalance(UUID accountId) {
        if (redisTemplate == null || accountId == null) {
            return;
        }
        try {
            redisTemplate.delete(KEY_PREFIX + accountId);
        } catch (Exception e) {
            log.warn("Redis evict failed for account {}: {}", accountId, e.getMessage());
        }
    }
}
