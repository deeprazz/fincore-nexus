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

    @Value("${gateway.rate-limit.requests-per-minute:120}")
    private long requestsPerMinute;

    public RateLimiterService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isAllowed(String clientIdentifier) {
        if (!enabled) {
            return true;
        }

        try {
            String key = "gateway:rate-limit:" + clientIdentifier;
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofMinutes(1));
            }
            return count == null || count <= requestsPerMinute;
        } catch (Exception e) {
            log.warn("Rate limiter Redis check failed (failing open for resilience): {}", e.getMessage());
            return true;
        }
    }

    public long getRequestsPerMinute() {
        return requestsPerMinute;
    }
}
