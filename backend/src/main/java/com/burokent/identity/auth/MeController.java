package com.burokent.identity.auth;

import com.burokent.identity.auth.AuthExceptions.InvalidSessionException;
import com.burokent.identity.user.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
class MeController {

    private final UserRepository users;

    record MeResponse(long id, String username, String displayName, boolean superAdmin, List<String> permissions) {}

    @GetMapping("/api/admin/me")
    MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return users.findById(Long.parseLong(jwt.getSubject()))
                .filter(user -> !user.isArchived())
                .map(user -> new MeResponse(
                        user.getId(), user.getUsername(), user.getDisplayName(), user.isSuperAdmin(), List.of()))
                .orElseThrow(InvalidSessionException::new);
    }
}
