package com.burokent.identity.auth;

import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Ends all refresh-token sessions of a user; access tokens are stopped by the user's session version. */
@Service
@RequiredArgsConstructor
public class SessionService {

    private final RefreshTokenRepository refreshTokens;
    private final Clock clock;

    @Transactional
    public void revokeAll(long userId) {
        refreshTokens.revokeAllForUser(userId, clock.instant());
    }
}
