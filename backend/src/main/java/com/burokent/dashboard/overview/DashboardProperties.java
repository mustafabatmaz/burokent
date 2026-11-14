package com.burokent.dashboard.overview;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The public sources of the start page. The user agent names the panel, as the weather service requires; it carries
 * no personal contact details.
 */
@ConfigurationProperties("burokent.dashboard")
record DashboardProperties(boolean enabled, String userAgent, String ratesUrl, String weatherUrl, Location location) {

    record Location(String name, double latitude, double longitude) {}
}
