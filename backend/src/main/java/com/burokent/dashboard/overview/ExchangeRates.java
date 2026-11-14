package com.burokent.dashboard.overview;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** The central bank's rates for one day: Turkish lira per unit of each currency. */
record ExchangeRates(LocalDate date, List<Rate> rates) {

    record Rate(String code, BigDecimal buying, BigDecimal selling) {}
}
