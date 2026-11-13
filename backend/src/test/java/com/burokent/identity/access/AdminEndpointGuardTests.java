package com.burokent.identity.access;

import static org.assertj.core.api.Assertions.assertThat;

import com.burokent.TestcontainersConfiguration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/** Every admin endpoint must declare the permission it needs; only login and the caller's own profile are exempt. */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class AdminEndpointGuardTests {

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    RequestMappingHandlerMapping handlerMapping;

    @Test
    void everyAdminEndpointRequiresAPermission() {
        List<String> unguarded = handlerMapping.getHandlerMethods().entrySet().stream()
                .filter(entry ->
                        entry.getKey().getPatternValues().stream().anyMatch(AdminEndpointGuardTests::isGuarded))
                .filter(entry -> !hasPreAuthorize(entry.getValue()))
                .map(entry -> entry.getKey().toString())
                .toList();

        assertThat(handlerMapping.getHandlerMethods()).isNotEmpty();
        assertThat(unguarded).isEmpty();
    }

    private static boolean isGuarded(String pattern) {
        return pattern.startsWith("/api/admin/")
                && !pattern.startsWith("/api/admin/auth/")
                && !pattern.equals("/api/admin/me")
                && !pattern.startsWith("/api/admin/me/");
    }

    private static boolean hasPreAuthorize(HandlerMethod method) {
        return AnnotatedElementUtils.hasAnnotation(method.getMethod(), PreAuthorize.class)
                || AnnotatedElementUtils.hasAnnotation(method.getBeanType(), PreAuthorize.class);
    }
}
