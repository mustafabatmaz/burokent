package com.burokent.media.library;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.burokent.TestcontainersConfiguration;
import com.burokent.media.MediaPermissions;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class MediaLibraryTests {

    private static final String ACCESS_COOKIE = "__Host-bk_access";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    Cookie superAdmin;

    @BeforeEach
    void logIn() throws Exception {
        superAdmin = mvc.perform(post("/api/admin/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"%s\", \"password\": \"%s\"}"
                                .formatted(
                                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME,
                                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_PASSWORD)))
                .andReturn()
                .getResponse()
                .getCookie(ACCESS_COOKIE);
    }

    @Test
    void uploadedImageIsServedPubliclyWithALongCache() throws Exception {
        String body = upload(TestImages.jpeg(800, 400), "Hilal makam.JPG")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/jpeg"))
                .andExpect(jsonPath("$.width").value(800))
                .andExpect(jsonPath("$.height").value(400))
                .andExpect(jsonPath("$.originalFileName").value("Hilal makam.JPG"))
                .andExpect(jsonPath("$.archived").value(false))
                .andExpect(jsonPath("$.version").value(0))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String url = JsonPath.read(body, "$.url");
        String thumbnailUrl = JsonPath.read(body, "$.thumbnailUrl");
        assertThat(url).matches("/api/public/media/[0-9a-f-]{36}\\.jpg");
        assertThat(thumbnailUrl).matches("/api/public/media/[0-9a-f-]{36}-400\\.jpg");

        byte[] master = mvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andReturn()
                .getResponse()
                .getContentAsByteArray();
        assertThat(TestImages.read(master).getWidth()).isEqualTo(800);
        byte[] thumbnail = mvc.perform(get(thumbnailUrl))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsByteArray();
        assertThat(TestImages.read(thumbnail).getWidth()).isEqualTo(400);
    }

    @Test
    void altTextsAreSavedWithAVersionCheckAndAudited() throws Exception {
        long id = uploadedId();

        update(id, altTexts("Hilal makam masası", " ", "طاولة"), 0)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.altText.tr").value("Hilal makam masası"))
                .andExpect(jsonPath("$.altText.en").value(nullValue()))
                .andExpect(jsonPath("$.altText.ar").value("طاولة"))
                .andExpect(jsonPath("$.version").value(1));
        update(id, altTexts("Eski sürüm", null, null), 0)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("conflict"));
        call(get("/api/admin/media/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.altText.tr").value("Hilal makam masası"));

        List<String> actions = jdbc.queryForList(
                "select action from audit_events where entity_type = 'media' and entity_id = ? order by id",
                String.class,
                Long.toString(id));
        assertThat(actions).containsExactly("media.uploaded", "media.updated");
    }

    @Test
    void altTextsAreLimitedInLength() throws Exception {
        long id = uploadedId();

        update(id, altTexts("x".repeat(251), null, null), 0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("altText.tr"));
    }

    @Test
    void archivedImagesAreNoLongerServed() throws Exception {
        String body = upload(TestImages.jpeg(50, 50), "a.jpg")
                .andReturn()
                .getResponse()
                .getContentAsString();
        long id = ((Number) JsonPath.read(body, "$.id")).longValue();
        String url = JsonPath.read(body, "$.url");

        call(post("/api/admin/media/" + id + "/archive")).andExpect(status().isNoContent());
        mvc.perform(get(url)).andExpect(status().isNotFound());
        call(get("/api/admin/media?archived=true&size=100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == " + id + ")]").exists());
        call(get("/api/admin/media?size=100"))
                .andExpect(jsonPath("$.content[?(@.id == " + id + ")]").doesNotExist());

        call(post("/api/admin/media/" + id + "/unarchive")).andExpect(status().isNoContent());
        mvc.perform(get(url)).andExpect(status().isOk());
    }

    @Test
    void listShowsTheNewestFirst() throws Exception {
        long older = uploadedId();
        long newer = uploadedId();

        String body = call(get("/api/admin/media?size=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.size").value(2))
                .andReturn()
                .getResponse()
                .getContentAsString();
        List<Integer> ids = JsonPath.read(body, "$.content[*].id");
        assertThat(ids).containsExactly((int) newer, (int) older);
    }

    @Test
    void unsupportedFilesAreRejected() throws Exception {
        upload(TestImages.gif(10, 10), "animation.gif")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("media_type_unsupported"));
    }

    @Test
    void unknownOrMalformedFileNamesAreNotFound() throws Exception {
        mvc.perform(get("/api/public/media/00000000-0000-0000-0000-000000000000.jpg"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/public/media/..%2F..%2Fetc%2Fpasswd")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/public/media/not-a-media-file.txt")).andExpect(status().isNotFound());
    }

    @Test
    void theStartingRoleCanUseTheLibrary() {
        List<String> granted = jdbc.queryForList("""
                select rp.permission_code from role_permissions rp join roles r on r.id = rp.role_id
                where r.name = 'Yönetici' and rp.permission_code like 'media.%'
                """, String.class);

        assertThat(granted).containsExactlyInAnyOrder(MediaPermissions.READ, MediaPermissions.MANAGE);
    }

    private long uploadedId() throws Exception {
        String body = upload(TestImages.jpeg(60, 40), "photo.jpg")
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private ResultActions upload(byte[] content, String fileName) throws Exception {
        return mvc.perform(multipart("/api/admin/media")
                .file(new MockMultipartFile("file", fileName, "application/octet-stream", content))
                .with(csrf())
                .cookie(superAdmin));
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.with(csrf()).cookie(superAdmin).contentType(MediaType.APPLICATION_JSON));
    }

    private static String altTexts(@Nullable String tr, @Nullable String en, @Nullable String ar) {
        return "{\"tr\": %s, \"en\": %s, \"ar\": %s}".formatted(json(tr), json(en), json(ar));
    }

    private static String json(@Nullable String value) {
        return value == null ? "null" : "\"" + value + "\"";
    }

    private ResultActions update(long id, String altText, long version) throws Exception {
        return call(put("/api/admin/media/" + id)
                .content("{\"altText\": %s, \"version\": %d}".formatted(altText, version)));
    }
}
