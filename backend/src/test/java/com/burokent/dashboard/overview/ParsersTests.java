package com.burokent.dashboard.overview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.xml.sax.SAXParseException;
import tools.jackson.databind.json.JsonMapper;

class ParsersTests {

    @Test
    void readsTheCentralBankRatesWeShow() {
        ExchangeRates rates = TcmbRates.parse(Fixtures.TCMB);

        assertThat(rates.date()).isEqualTo(LocalDate.of(2026, 11, 13));
        assertThat(rates.rates()).extracting(ExchangeRates.Rate::code).containsExactly("USD", "EUR", "SAR");
        ExchangeRates.Rate riyal = rates.rates().get(2);
        assertThat(riyal.buying()).isEqualByComparingTo(new BigDecimal("10.6900"));
        assertThat(riyal.selling()).isEqualByComparingTo(new BigDecimal("10.7100"));
    }

    @Test
    void refusesXmlWithADocumentTypeDeclaration() {
        String hostile = """
                <?xml version="1.0"?>
                <!DOCTYPE x [<!ENTITY secret SYSTEM "file:///etc/passwd">]>
                <Tarih_Date Tarih="13.11.2026"><Currency Kod="USD"><ForexBuying>&secret;</ForexBuying></Currency>
                </Tarih_Date>
                """;

        // Rejected by the parser itself, before any entity is read; not merely as a bad number afterwards
        assertThatThrownBy(() -> TcmbRates.parse(hostile))
                .isInstanceOf(FeedException.class)
                .rootCause()
                .isInstanceOf(SAXParseException.class)
                .hasMessageContaining("DOCTYPE");
    }

    @Test
    void readsTheLatestGoldClosingPricePerGramAndTheOneBefore() {
        Gold gold = EvdsGold.parse(JsonMapper.builder().build(), Fixtures.EVDS_GOLD);

        assertThat(gold.date()).isEqualTo(LocalDate.of(2026, 11, 13));
        assertThat(gold.perGram()).isEqualByComparingTo("6321.00");
        assertThat(gold.previousPerGram()).isEqualByComparingTo("6379.00");
    }

    @Test
    void refusesAGoldAnswerWithoutAnyPrice() {
        assertThatThrownBy(() -> EvdsGold.parse(JsonMapper.builder().build(), "{\"totalCount\":0,\"items\":[]}"))
                .isInstanceOf(FeedException.class);
    }

    @Test
    void readsTheCurrentWeatherAndDaysInIstanbulTime() {
        Weather weather = MetNoWeather.parse(JsonMapper.builder().build(), Fixtures.MET_NO);

        assertThat(weather.updatedAt()).isEqualTo(Instant.parse("2026-11-14T07:19:19Z"));
        assertThat(weather.temperature()).isEqualByComparingTo("15.7");
        assertThat(weather.symbol()).isEqualTo("partlycloudy_day");
        assertThat(weather.days()).hasSize(2);
        Weather.Day today = weather.days().get(0);
        assertThat(today.date()).isEqualTo(LocalDate.of(2026, 11, 14));
        assertThat(today.min()).isEqualByComparingTo("12.4");
        assertThat(today.max()).isEqualByComparingTo("19.2");
        // The midday forecast describes the day
        assertThat(today.symbol()).isEqualTo("cloudy");
        Weather.Day tomorrow = weather.days().get(1);
        assertThat(tomorrow.date()).isEqualTo(LocalDate.of(2026, 11, 15));
        assertThat(tomorrow.min()).isEqualByComparingTo("9.1");
        assertThat(tomorrow.max()).isEqualByComparingTo("17.0");
        assertThat(tomorrow.symbol()).isEqualTo("lightrain");
    }
}
