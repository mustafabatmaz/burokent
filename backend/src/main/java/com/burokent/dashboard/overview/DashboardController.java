package com.burokent.dashboard.overview;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
class DashboardController {

    private final DashboardFeeds feeds;
    private final DashboardProperties properties;

    /** Rates as strings, like money elsewhere in the API; null when a source has not answered yet. */
    record RateView(String code, String buying, String selling) {}

    record RatesView(LocalDate date, List<RateView> rates, Instant fetchedAt) {}

    record DayView(LocalDate date, BigDecimal min, BigDecimal max, String symbol) {}

    record WeatherView(
            BigDecimal temperature, String symbol, List<DayView> days, Instant updatedAt, Instant fetchedAt) {}

    record GoldView(
            LocalDate date, String perGram, @Nullable String previousPerGram, Instant fetchedAt) {}

    /** goldConfigured is false while no EVDS key is set on the server. */
    record DashboardView(
            String location,
            @Nullable RatesView rates,
            @Nullable WeatherView weather,
            @Nullable GoldView gold,
            boolean goldConfigured) {}

    @GetMapping("/api/admin/dashboard")
    @PreAuthorize("isAuthenticated()")
    DashboardView dashboard() {
        RatesView rates = feeds.rates()
                .map(snapshot -> new RatesView(
                        snapshot.value().date(),
                        snapshot.value().rates().stream()
                                .map(rate -> new RateView(
                                        rate.code(),
                                        rate.buying().toPlainString(),
                                        rate.selling().toPlainString()))
                                .toList(),
                        snapshot.fetchedAt()))
                .orElse(null);
        WeatherView weather = feeds.weather()
                .map(snapshot -> new WeatherView(
                        snapshot.value().temperature(),
                        snapshot.value().symbol(),
                        snapshot.value().days().stream()
                                .map(day -> new DayView(day.date(), day.min(), day.max(), day.symbol()))
                                .toList(),
                        snapshot.value().updatedAt(),
                        snapshot.fetchedAt()))
                .orElse(null);
        GoldView gold = feeds.gold()
                .map(snapshot -> new GoldView(
                        snapshot.value().date(),
                        snapshot.value().perGram().toPlainString(),
                        snapshot.value().previousPerGram() == null
                                ? null
                                : snapshot.value().previousPerGram().toPlainString(),
                        snapshot.fetchedAt()))
                .orElse(null);
        return new DashboardView(properties.location().name(), rates, weather, gold, feeds.goldConfigured());
    }
}
