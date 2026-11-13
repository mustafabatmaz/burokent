package com.burokent.identity.access;

import com.burokent.shared.PermissionDefinition;
import com.burokent.shared.PermissionProvider;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** All permissions declared by the modules. */
@Component
public class PermissionRegistry {

    private static final Pattern CODE = Pattern.compile("[a-z]+(\\.[a-z]+)+");

    private final Map<String, PermissionDefinition> byCode;

    PermissionRegistry(List<PermissionProvider> providers) {
        List<PermissionDefinition> all = providers.stream()
                .flatMap(provider -> provider.permissions().stream())
                .toList();
        all.stream()
                .filter(permission -> !CODE.matcher(permission.code()).matches())
                .findFirst()
                .ifPresent(permission -> {
                    throw new IllegalStateException("Invalid permission code: " + permission.code());
                });
        byCode = all.stream().collect(Collectors.toUnmodifiableMap(PermissionDefinition::code, Function.identity()));
    }

    public List<PermissionDefinition> all() {
        return byCode.values().stream()
                .sorted(Comparator.comparing(PermissionDefinition::code))
                .toList();
    }

    public Set<String> codes() {
        return byCode.keySet();
    }

    public Optional<PermissionDefinition> find(String code) {
        return Optional.ofNullable(byCode.get(code));
    }
}
