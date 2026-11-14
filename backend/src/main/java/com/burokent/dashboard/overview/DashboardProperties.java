package com.burokent.dashboard.overview;

import org.jspecify.annotations.Nullable;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The public sources of the start page. The user agent names the panel, as the weather service requires; it carries
 * no personal contact details. The EVDS key comes from the environment only; without it there is no gold price.
 */
@ConfigurationProperties("burokent.dashboard")
record DashboardProperties(
        boolean enabled,
        String userAgent,
        String ratesUrl,
        String weatherUrl,
        String goldUrl,
        @Nullable String evdsKey,
        Location location) {

    boolean hasEvdsKey() {
        return evdsKey != null && !evdsKey.isBlank();
    }

    record Location(String name, double latitude, double longitude) {}
}
