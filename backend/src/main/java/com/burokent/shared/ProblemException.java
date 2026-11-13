package com.burokent.shared;

import java.util.List;
import org.springframework.http.HttpStatus;

/**
 * A business error that is returned to the client as ProblemDetail with a machine-readable {@code code} and optional
 * field errors.
 */
public class ProblemException extends RuntimeException {

    public record FieldProblem(String field, String code) {}

    private final HttpStatus status;
    private final String code;
    private final List<FieldProblem> errors;

    public ProblemException(HttpStatus status, String code) {
        this(status, code, List.of());
    }

    public ProblemException(HttpStatus status, String code, List<FieldProblem> errors) {
        super(code);
        this.status = status;
        this.code = code;
        this.errors = List.copyOf(errors);
    }

    public static ProblemException fieldError(String field, String code) {
        return new ProblemException(
                HttpStatus.BAD_REQUEST, "validation_failed", List.of(new FieldProblem(field, code)));
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public List<FieldProblem> errors() {
        return errors;
    }
}
