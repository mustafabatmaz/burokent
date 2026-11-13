package com.burokent.audit;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

/**
 * Every write transaction in a service must publish an audit event, either itself or through a helper of the same
 * class. Deliberate exceptions are marked with {@link NotAudited}.
 */
class AuditCoverageTests {

    private final JavaClasses classes = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.burokent");

    @Test
    void everyWriteTransactionPublishesAnAuditEvent() {
        List<String> unaudited = classes.stream()
                .flatMap(javaClass -> javaClass.getMethods().stream())
                .filter(AuditCoverageTests::isWriteTransaction)
                .filter(method -> !method.isAnnotatedWith(NotAudited.class))
                .filter(method -> !publishesEvent(method))
                .map(JavaMethod::getFullName)
                .toList();

        assertThat(unaudited).isEmpty();
    }

    @Test
    void theRuleSeesTheKnownWriteTransactions() {
        long writeTransactions = classes.stream()
                .flatMap(javaClass -> javaClass.getMethods().stream())
                .filter(AuditCoverageTests::isWriteTransaction)
                .count();

        assertThat(writeTransactions).isGreaterThan(10);
    }

    private static boolean isWriteTransaction(JavaMethod method) {
        return method.tryGetAnnotationOfType(Transactional.class)
                .map(transactional -> !transactional.readOnly())
                .orElse(false);
    }

    private static boolean publishesEvent(JavaMethod start) {
        Deque<JavaMethod> toVisit = new ArrayDeque<>(List.of(start));
        Set<JavaMethod> visited = new HashSet<>();
        while (!toVisit.isEmpty()) {
            JavaMethod method = toVisit.pop();
            if (!visited.add(method)) {
                continue;
            }
            for (JavaMethodCall call : method.getMethodCallsFromSelf()) {
                if (call.getTargetOwner().isAssignableTo(ApplicationEventPublisher.class)
                        && call.getName().equals("publishEvent")) {
                    return true;
                }
                if (call.getTargetOwner().equals(start.getOwner())) {
                    call.getTarget().resolveMember().ifPresent(target -> {
                        if (target instanceof JavaMethod javaMethod) {
                            toVisit.push(javaMethod);
                        }
                    });
                }
            }
        }
        return false;
    }
}
