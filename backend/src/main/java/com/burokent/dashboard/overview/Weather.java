package com.burokent.dashboard.overview;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Now and the coming days. Symbols are the weather service's codes, e.g. "partlycloudy_day". */
record Weather(Instant updatedAt, BigDecimal temperature, String symbol, List<Day> days) {

    record Day(LocalDate date, BigDecimal min, BigDecimal max, String symbol) {}
}
