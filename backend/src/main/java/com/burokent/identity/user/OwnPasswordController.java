package com.burokent.identity.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Every logged-in user may change their own password. */
@RestController
@RequiredArgsConstructor
class OwnPasswordController {

    private final UserManagementService users;

    record ChangePasswordRequest(
            @NotBlank String currentPassword, @NotBlank String newPassword) {}

    @PostMapping("/api/admin/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void change(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangePasswordRequest request) {
        users.changeOwnPassword(Long.parseLong(jwt.getSubject()), request.currentPassword(), request.newPassword());
    }
}
