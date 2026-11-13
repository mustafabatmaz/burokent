package com.burokent.identity.user;

import com.burokent.shared.ProblemException;
import java.nio.charset.StandardCharsets;

/** At least 12 characters, at most 72 bytes (bcrypt limit); no composition rules. */
final class PasswordPolicy {

    static final int MIN_LENGTH = 12;
    static final int MAX_BYTES = 72;

    private PasswordPolicy() {}

    static void check(String field, String password) {
        if (password.codePointCount(0, password.length()) < MIN_LENGTH) {
            throw ProblemException.fieldError(field, "password_too_short");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw ProblemException.fieldError(field, "password_too_long");
        }
    }
}
