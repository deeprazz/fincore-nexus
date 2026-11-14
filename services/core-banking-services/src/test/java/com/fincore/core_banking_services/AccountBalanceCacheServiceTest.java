package com.fincore.core_banking_services;

import com.fincore.core_banking_services.account.AccountBalanceCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountBalanceCacheServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private AccountBalanceCacheService cacheService;

    @BeforeEach
    void setUp() {
        cacheService = new AccountBalanceCacheService(redisTemplate);
    }

    @Test
    void shouldReturnCachedBalanceWhenPresent() {
        UUID accountId = UUID.randomUUID();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("account:balance:" + accountId)).thenReturn("5432.10");

        Optional<BigDecimal> result = cacheService.getCachedBalance(accountId);

        assertTrue(result.isPresent());
        assertEquals(new BigDecimal("5432.10"), result.get());
    }

    @Test
    void shouldReturnEmptyWhenCacheMiss() {
        UUID accountId = UUID.randomUUID();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("account:balance:" + accountId)).thenReturn(null);

        Optional<BigDecimal> result = cacheService.getCachedBalance(accountId);

        assertTrue(result.isEmpty());
    }

    @Test
    void shouldCacheBalanceWithTtl() {
        UUID accountId = UUID.randomUUID();
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        cacheService.cacheBalance(accountId, new BigDecimal("1000.00"));

        verify(valueOperations).set(eq("account:balance:" + accountId), eq("1000.00"), eq(Duration.ofSeconds(60)));
    }

    @Test
    void shouldEvictBalance() {
        UUID accountId = UUID.randomUUID();

        cacheService.evictBalance(accountId);

        verify(redisTemplate).delete("account:balance:" + accountId);
    }

    @Test
    void shouldHandleRedisFailureGracefully() {
        UUID accountId = UUID.randomUUID();
        when(redisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis connection refused"));

        Optional<BigDecimal> result = cacheService.getCachedBalance(accountId);

        assertTrue(result.isEmpty());
    }
}
