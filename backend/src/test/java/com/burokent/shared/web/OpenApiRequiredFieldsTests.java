package com.burokent.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.burokent.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

/** Record components are required in the spec unless they are marked @Nullable, so the generated types are exact. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiRequiredFieldsTests {

    @Autowired
    MockMvc mvc;

    @Test
    void nonNullableRecordComponentsAreRequired() throws Exception {
        String spec =
                mvc.perform(get("/v3/api-docs/admin")).andReturn().getResponse().getContentAsString();

        List<String> me = JsonPath.read(spec, "$.components.schemas.MeResponse.required");
        assertThat(me).containsExactlyInAnyOrder("id", "username", "displayName", "superAdmin", "permissions");

        List<String> auditEvent = JsonPath.read(spec, "$.components.schemas.AuditEventView.required");
        assertThat(auditEvent)
                .contains("id", "occurredAt", "action", "entityType", "changes")
                .doesNotContain("actorName", "entityId", "ip");

        List<String> change = JsonPath.read(spec, "$.components.schemas.ChangeView.required");
        assertThat(change).containsExactlyInAnyOrder("field", "masked");
    }
}
