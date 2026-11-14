package com.burokent.dashboard.overview;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reads the central bank's EVDS answer for Borsa İstanbul's gold closing price. The series is in lira per kilogram
 * (the per-gram series stopped being updated), so it is divided by a thousand.
 */
final class EvdsGold {

    static final String SERIES = "TP.ALTINPIYASA.KAP02";
    static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final String FIELD = SERIES.replace('.', '_');
    private static final BigDecimal GRAMS_PER_KG = BigDecimal.valueOf(1000);

    private EvdsGold() {}

    static Gold parse(JsonMapper json, String body) {
        try {
            List<LocalDate> dates = new ArrayList<>();
            List<BigDecimal> prices = new ArrayList<>();
            // Days without a price yet (holidays, today before closing) come as null
            for (JsonNode item : json.readTree(body).path("items")) {
                String value = item.path(FIELD).asString("");
                if (!value.isBlank()) {
                    dates.add(LocalDate.parse(item.path("Tarih").asString(), DATE));
                    prices.add(perGram(new BigDecimal(value)));
                }
            }
            if (prices.isEmpty()) {
                throw new FeedException("No gold price in the answer");
            }
            int last = prices.size() - 1;
            return new Gold(dates.get(last), prices.get(last), last > 0 ? prices.get(last - 1) : null);
        } catch (JacksonException | NumberFormatException | java.time.format.DateTimeParseException e) {
            throw new FeedException("Unreadable gold answer", e);
        }
    }

    private static BigDecimal perGram(BigDecimal perKilogram) {
        return perKilogram.divide(GRAMS_PER_KG, 2, RoundingMode.HALF_UP);
    }
}
