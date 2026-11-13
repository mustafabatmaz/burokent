package com.burokent.shared.web;

import com.burokent.shared.ProblemException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Renders every error as RFC 9457 ProblemDetail with a machine-readable {@code code}; the frontend translates codes
 * into user-facing text.
 */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    static final String CODE = "code";
    static final String ERRORS = "errors";

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ex.getBody();
        problem.setProperty(CODE, "validation_failed");
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> Map.of("field", error.getField(), CODE, toSnakeCase(error.getCode())))
                .toList();
        problem.setProperty(ERRORS, errors);
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    @ExceptionHandler(ProblemException.class)
    ResponseEntity<ProblemDetail> handleProblem(ProblemException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(ex.status());
        problem.setProperty(CODE, ex.code());
        if (!ex.errors().isEmpty()) {
            problem.setProperty(
                    ERRORS,
                    ex.errors().stream()
                            .map(error -> Map.of("field", error.field(), CODE, error.code()))
                            .toList());
        }
        return ResponseEntity.status(ex.status()).body(problem);
    }

    /** Someone else saved the record first (JPA version check). */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<ProblemDetail> handleOptimisticLock() {
        return handleProblem(new ProblemException(HttpStatus.CONFLICT, "conflict"));
    }

    @Override
    protected @Nullable ResponseEntity<Object> createResponseEntity(
            @Nullable Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        if (body instanceof ProblemDetail problem
                && (problem.getProperties() == null || !problem.getProperties().containsKey(CODE))) {
            problem.setProperty(CODE, codeFor(status));
        }
        return super.createResponseEntity(body, headers, status, request);
    }

    private static String codeFor(HttpStatusCode status) {
        return status instanceof HttpStatus known ? known.name().toLowerCase(Locale.ROOT) : "http_" + status.value();
    }

    private static String toSnakeCase(@Nullable String constraintName) {
        if (constraintName == null) {
            return "invalid";
        }
        return constraintName.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }
}
