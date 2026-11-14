package com.burokent.dashboard.overview;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/** Borsa İstanbul's closing price of 1000/1000 gold for one business day, in Turkish lira per gram. */
record Gold(LocalDate date, BigDecimal perGram, @Nullable BigDecimal previousPerGram) {}
