package com.fincore.api_gateway.ratelimit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    private final StringRedisTemplate redisTemplate;

    @Value("${gateway.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${gateway.rate-limit.requests-per-minute:600}")
    private long requestsPerMinute;

    public RateLimiterService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public record RateLimitStatus(boolean allowed, long remaining, long limit, long retryAfterSeconds) {}

    public RateLimitStatus checkRateLimit(String clientIdentifier) {
        if (!enabled) {
            return new RateLimitStatus(true, requestsPerMinute, requestsPerMinute, 0);
        }

        try {
            String key = "gateway:rate-limit:" + clientIdentifier;
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofMinutes(1));
            } else if (count != null && count > 1) {
                Long ttl = redisTemplate.getExpire(key);
                if (ttl != null && ttl < 0) {
                    redisTemplate.expire(key, Duration.ofMinutes(1));
                }
            }

            long current = count != null ? count : 1;
            boolean allowed = current <= requestsPerMinute;
            long remaining = Math.max(0, requestsPerMinute - current);
            Long ttlSeconds = redisTemplate.getExpire(key);
            long retryAfter = (ttlSeconds != null && ttlSeconds > 0) ? ttlSeconds : 5;

            return new RateLimitStatus(allowed, remaining, requestsPerMinute, retryAfter);
        } catch (Exception e) {
            log.warn("Rate limiter Redis check failed (failing open for resilience): {}", e.getMessage());
            return new RateLimitStatus(true, requestsPerMinute, requestsPerMinute, 0);
        }
    }

    public boolean isAllowed(String clientIdentifier) {
        return checkRateLimit(clientIdentifier).allowed();
    }

    public long getRequestsPerMinute() {
        return requestsPerMinute;
    }
}
