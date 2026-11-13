package com.burokent.identity.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Counts failed logins in memory over a sliding window, per username + IP and per IP. Blocks temporarily; accounts
 * are never locked permanently.
 */
@Component
@RequiredArgsConstructor
class LoginAttemptLimiter {

    static final Duration WINDOW = Duration.ofMinutes(15);
    static final int MAX_FAILURES_PER_USERNAME_AND_IP = 5;
    static final int MAX_FAILURES_PER_IP = 20;

    private final Clock clock;
    private final Map<String, Deque<Instant>> failures = new HashMap<>();

    /** Returns how long the caller has to wait, or empty when the attempt is allowed. */
    synchronized Optional<Duration> blockedFor(String username, String ip) {
        Instant now = clock.instant();
        Duration wait = Duration.ZERO;
        wait = max(wait, waitFor(usernameKey(username, ip), MAX_FAILURES_PER_USERNAME_AND_IP, now));
        wait = max(wait, waitFor(ipKey(ip), MAX_FAILURES_PER_IP, now));
        return wait.isZero() ? Optional.empty() : Optional.of(wait);
    }

    synchronized void recordFailure(String username, String ip) {
        Instant now = clock.instant();
        failures.computeIfAbsent(usernameKey(username, ip), key -> new ArrayDeque<>())
                .addLast(now);
        failures.computeIfAbsent(ipKey(ip), key -> new ArrayDeque<>()).addLast(now);
    }

    synchronized void recordSuccess(String username, String ip) {
        failures.remove(usernameKey(username, ip));
    }

    private Duration waitFor(String key, int limit, Instant now) {
        Deque<Instant> attempts = failures.get(key);
        if (attempts == null) {
            return Duration.ZERO;
        }
        while (!attempts.isEmpty() && !attempts.peekFirst().plus(WINDOW).isAfter(now)) {
            attempts.removeFirst();
        }
        if (attempts.isEmpty()) {
            failures.remove(key);
            return Duration.ZERO;
        }
        if (attempts.size() < limit) {
            return Duration.ZERO;
        }
        Instant oldestCounted =
                attempts.stream().skip(attempts.size() - limit).findFirst().orElseThrow();
        return Duration.between(now, oldestCounted.plus(WINDOW));
    }

    private static Duration max(Duration a, Duration b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    private static String usernameKey(String username, String ip) {
        return "user:" + ip + ":" + username;
    }

    private static String ipKey(String ip) {
        return "ip:" + ip;
    }
}
