package com.burokent.identity.auth;

import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
class RefreshTokenCleanup {

    private final RefreshTokenRepository refreshTokens;
    private final Clock clock;

    @Scheduled(cron = "0 0 4 * * *", zone = "UTC")
    @Transactional
    void deleteExpiredTokens() {
        refreshTokens.deleteExpired(clock.instant());
    }
}
