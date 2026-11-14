package com.burokent.dashboard.overview;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Reads MET Norway's Locationforecast 2.0 "compact" answer into now plus the coming days, in Turkish time. */
final class MetNoWeather {

    static final ZoneId TURKEY = ZoneId.of("Europe/Istanbul");
    private static final int DAYS = 3;
    private static final LocalTime MIDDAY = LocalTime.NOON;

    private MetNoWeather() {}

    static Weather parse(JsonMapper json, String body) {
        try {
            JsonNode properties = json.readTree(body).path("properties");
            JsonNode series = properties.path("timeseries");
            if (!series.isArray() || series.isEmpty()) {
                throw new FeedException("No forecast in the weather answer");
            }
            JsonNode first = series.get(0).path("data");
            Instant updatedAt =
                    Instant.parse(properties.path("meta").path("updated_at").asString());
            BigDecimal temperature = temperature(first);
            String symbol = symbol(first);
            if (temperature == null || symbol == null) {
                throw new FeedException("No current weather in the answer");
            }
            return new Weather(updatedAt, temperature, symbol, days(series));
        } catch (JacksonException | java.time.format.DateTimeParseException e) {
            throw new FeedException("Unreadable weather answer", e);
        }
    }

    private static List<Weather.Day> days(JsonNode series) {
        Map<LocalDate, DayBuilder> byDate = new LinkedHashMap<>();
        for (JsonNode entry : series) {
            ZonedDateTime time = Instant.parse(entry.path("time").asString()).atZone(TURKEY);
            JsonNode data = entry.path("data");
            BigDecimal temperature = temperature(data);
            if (temperature == null) {
                continue;
            }
            if (!byDate.containsKey(time.toLocalDate()) && byDate.size() == DAYS) {
                break;
            }
            byDate.computeIfAbsent(time.toLocalDate(), DayBuilder::new).add(time, temperature, data);
        }
        List<Weather.Day> days = new ArrayList<>();
        byDate.values().forEach(day -> days.add(day.build()));
        return days;
    }

    private static @Nullable BigDecimal temperature(JsonNode data) {
        JsonNode value = data.path("instant").path("details").path("air_temperature");
        return value.isNumber() ? value.decimalValue() : null;
    }

    /** The shortest period that has a summary: the next hour, else six, else twelve hours. */
    private static @Nullable String symbol(JsonNode data) {
        for (String period : List.of("next_1_hours", "next_6_hours", "next_12_hours")) {
            String code = data.path(period).path("summary").path("symbol_code").asString("");
            if (!code.isEmpty()) {
                return code;
            }
        }
        return null;
    }

    private static final class DayBuilder {

        private final LocalDate date;
        private BigDecimal min;
        private BigDecimal max;
        private @Nullable String symbol;
        private long symbolDistance = Long.MAX_VALUE;

        DayBuilder(LocalDate date) {
            this.date = date;
        }

        void add(ZonedDateTime time, BigDecimal temperature, JsonNode data) {
            min = min == null || temperature.compareTo(min) < 0 ? temperature : min;
            max = max == null || temperature.compareTo(max) > 0 ? temperature : max;
            // The day is described by the forecast closest to midday
            String code = symbol(data);
            long distance = Math.abs(
                    java.time.Duration.between(time.toLocalTime(), MIDDAY).toMinutes());
            if (code != null && distance < symbolDistance) {
                symbol = code;
                symbolDistance = distance;
            }
        }

        Weather.Day build() {
            return new Weather.Day(date, min, max, symbol == null ? "" : symbol);
        }
    }
}
