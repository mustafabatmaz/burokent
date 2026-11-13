package com.burokent.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.burokent.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * The frontend generates its API types from the specs committed in the api-client package. This test fails when they
 * drift from the API; refresh them with {@code ./mvnw test -Dtest=OpenApiSpecTests -Dupdate-specs=true}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiSpecTests {

    private static final Path SPEC_DIR = Path.of("../frontend/packages/api-client/openapi");
    private static final JsonMapper PRETTY = JsonMapper.builder()
            .enable(SerializationFeature.INDENT_OUTPUT)
            .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
            .build();

    @Autowired
    MockMvc mvc;

    @ParameterizedTest
    @ValueSource(strings = {"public", "admin"})
    void committedSpecMatchesTheApi(String group) throws Exception {
        String actual = normalize(mvc.perform(get("/v3/api-docs/" + group))
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8));
        Path file = SPEC_DIR.resolve(group + ".json");

        if (Boolean.getBoolean("update-specs")) {
            write(file, actual);
            return;
        }

        assertThat(file).exists();
        assertThat(Files.readString(file))
                .as("spec %s is out of date: run ./mvnw test -Dtest=OpenApiSpecTests -Dupdate-specs=true", file)
                .isEqualTo(actual);
    }

    private static String normalize(String json) {
        Map<?, ?> tree = PRETTY.readValue(json, Map.class);
        return PRETTY.writeValueAsString(tree) + "\n";
    }

    private static void write(Path file, String content) throws IOException {
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
    }
}
