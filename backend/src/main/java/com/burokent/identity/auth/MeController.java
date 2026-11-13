package com.burokent.identity.auth;

import com.burokent.identity.access.AccessService;
import com.burokent.identity.access.UserAccess;
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
    private final AccessService access;

    record MeResponse(long id, String username, String displayName, boolean superAdmin, List<String> permissions) {}

    @GetMapping("/api/admin/me")
    MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        long userId = Long.parseLong(jwt.getSubject());
        List<String> permissions =
                access.find(userId).map(UserAccess::permissions).orElseThrow(InvalidSessionException::new).stream()
                        .sorted()
                        .toList();
        return users.findById(userId)
                .map(user -> new MeResponse(
                        user.getId(), user.getUsername(), user.getDisplayName(), user.isSuperAdmin(), permissions))
                .orElseThrow(InvalidSessionException::new);
    }
}
