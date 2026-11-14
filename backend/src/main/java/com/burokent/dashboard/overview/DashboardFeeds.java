package com.burokent.dashboard.overview;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Fetches the start page's sources on a schedule and keeps the last good answer of each. A failing source keeps its
 * previous value, so the panel shows that with its time instead of nothing.
 */
@Slf4j
@Component
@EnableConfigurationProperties(DashboardProperties.class)
class DashboardFeeds {

    private final RestClient http;
    private final DashboardProperties properties;
    private final JsonMapper json;
    private final Clock clock;
    private final AtomicReference<Snapshot<ExchangeRates>> rates = new AtomicReference<>();
    private final AtomicReference<Snapshot<Weather>> weather = new AtomicReference<>();

    @Autowired
    DashboardFeeds(DashboardProperties properties, JsonMapper json, Clock clock) {
        this(configure(RestClient.builder(), properties).build(), properties, json, clock);
    }

    DashboardFeeds(RestClient http, DashboardProperties properties, JsonMapper json, Clock clock) {
        this.http = http;
        this.properties = properties;
        this.json = json;
        this.clock = clock;
    }

    /** Short timeouts, so a hanging source never holds the scheduler, and the name the weather service asks for. */
    static RestClient.Builder configure(RestClient.Builder builder, DashboardProperties properties) {
        JdkClientHttpRequestFactory requests = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        requests.setReadTimeout(Duration.ofSeconds(15));
        return builder.requestFactory(requests)
                .defaultHeader(HttpHeaders.USER_AGENT, properties.userAgent())
                // gzip only: offered "deflate", the central bank's server sends raw deflate data, which Java's
                // decompressor rejects ("incorrect header check")
                .defaultHeader(HttpHeaders.ACCEPT_ENCODING, "gzip");
    }

    Optional<Snapshot<ExchangeRates>> rates() {
        return Optional.ofNullable(rates.get());
    }

    Optional<Snapshot<Weather>> weather() {
        return Optional.ofNullable(weather.get());
    }

    /** The central bank publishes once a working day, in the afternoon; half-hourly is plenty. */
    @Scheduled(initialDelay = 5_000, fixedDelayString = "PT30M")
    void refreshRates() {
        if (!properties.enabled()) {
            return;
        }
        try {
            String body = http.get().uri(properties.ratesUrl()).retrieve().body(String.class);
            rates.set(new Snapshot<>(TcmbRates.parse(body == null ? "" : body), clock.instant()));
        } catch (RestClientException | FeedException e) {
            log.warn("Exchange rates not refreshed: {}", reason(e));
        }
    }

    /** The forecast changes about hourly; asking more often only loads the free service. */
    @Scheduled(initialDelay = 10_000, fixedDelayString = "PT1H")
    void refreshWeather() {
        if (!properties.enabled()) {
            return;
        }
        DashboardProperties.Location location = properties.location();
        try {
            String body = http.get()
                    .uri(properties.weatherUrl() + "?lat={lat}&lon={lon}", location.latitude(), location.longitude())
                    .retrieve()
                    .body(String.class);
            weather.set(new Snapshot<>(MetNoWeather.parse(json, body == null ? "" : body), clock.instant()));
        } catch (RestClientException | FeedException e) {
            log.warn("Weather not refreshed: {}", reason(e));
        }
    }

    /** The innermost cause: the wrapper's own message ("Error while extracting response…") says little. */
    private static String reason(Exception e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause == e ? String.valueOf(e.getMessage()) : e.getMessage() + " (" + cause + ")";
    }
}
