package com.burokent.identity.access;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Turns a valid access token into the user's current permissions. Rejects tokens of archived users and tokens issued
 * before the user's sessions were ended.
 */
@Component
@RequiredArgsConstructor
public class UserJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    public static final String SESSION_VERSION_CLAIM = "sv";

    private final AccessService accessService;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        long userId = Long.parseLong(jwt.getSubject());
        Number sessionVersion = jwt.getClaim(SESSION_VERSION_CLAIM);
        UserAccess access = accessService
                .find(userId)
                .filter(found -> sessionVersion != null && found.sessionVersion() == sessionVersion.intValue())
                .orElseThrow(() -> new InvalidBearerTokenException("Session is no longer valid"));
        List<SimpleGrantedAuthority> authorities =
                access.permissions().stream().map(SimpleGrantedAuthority::new).toList();
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
