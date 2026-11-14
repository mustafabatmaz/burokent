package com.burokent.dashboard.overview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.burokent.MutableClock;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

class DashboardFeedsTests {

    private static final String TCMB_URL = "https://rates.example/today.xml";
    private static final String WEATHER_URL = "https://weather.example/compact";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-11-14T08:00:00Z"));
    private MockRestServiceServer server;
    private DashboardFeeds feeds;

    @BeforeEach
    void setUp() {
        DashboardProperties properties = new DashboardProperties(
                true,
                "TestPanel/1.0 https://example.com",
                TCMB_URL,
                WEATHER_URL,
                new DashboardProperties.Location("Antakya", 36.2025, 36.1606));
        // The production setup first; the mock server then takes over the transport
        RestClient.Builder builder = DashboardFeeds.configure(RestClient.builder(), properties);
        server = MockRestServiceServer.bindTo(builder).build();
        feeds = new DashboardFeeds(
                builder.build(), properties, JsonMapper.builder().build(), clock);
    }

    @Test
    void identifiesItselfAndKeepsWhatItFetched() {
        server.expect(requestTo(TCMB_URL))
                .andExpect(header("User-Agent", "TestPanel/1.0 https://example.com"))
                .andExpect(header("Accept-Encoding", "gzip"))
                .andRespond(withSuccess(Fixtures.TCMB, MediaType.APPLICATION_XML));
        server.expect(requestTo(WEATHER_URL + "?lat=36.2025&lon=36.1606"))
                .andExpect(header("User-Agent", "TestPanel/1.0 https://example.com"))
                .andRespond(withSuccess(Fixtures.MET_NO, MediaType.APPLICATION_JSON));

        feeds.refreshRates();
        feeds.refreshWeather();

        assertThat(feeds.rates()).hasValueSatisfying(snapshot -> {
            assertThat(snapshot.value().rates()).hasSize(3);
            assertThat(snapshot.fetchedAt()).isEqualTo(clock.instant());
        });
        assertThat(feeds.weather())
                .hasValueSatisfying(
                        snapshot -> assertThat(snapshot.value().days()).hasSize(2));
        server.verify();
    }

    @Test
    void keepsTheLastGoodValueWhenASourceFails() {
        server.expect(requestTo(TCMB_URL)).andRespond(withSuccess(Fixtures.TCMB, MediaType.APPLICATION_XML));
        server.expect(requestTo(TCMB_URL)).andRespond(withServerError());
        server.expect(requestTo(TCMB_URL)).andRespond(withSuccess("<html>maintenance</html>", MediaType.TEXT_HTML));

        feeds.refreshRates();
        Instant firstFetch = clock.instant();
        clock.advance(java.time.Duration.ofMinutes(30));
        feeds.refreshRates();
        feeds.refreshRates();

        assertThat(feeds.rates()).hasValueSatisfying(snapshot -> {
            assertThat(snapshot.fetchedAt()).isEqualTo(firstFetch);
            assertThat(snapshot.value().rates()).hasSize(3);
        });
    }

    @Test
    void fetchesNothingWhenSwitchedOff() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer silent = MockRestServiceServer.bindTo(builder).build();
        DashboardFeeds off = new DashboardFeeds(
                builder.build(),
                new DashboardProperties(false, "x", TCMB_URL, WEATHER_URL, new DashboardProperties.Location("A", 0, 0)),
                JsonMapper.builder().build(),
                clock);

        off.refreshRates();
        off.refreshWeather();

        assertThat(off.rates()).isEmpty();
        assertThat(off.weather()).isEmpty();
        silent.verify();
    }
}
