package com.burokent.media.library;

import com.burokent.media.MediaPermissions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.core.io.Resource;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/media")
@RequiredArgsConstructor
class MediaController {

    private static final String READ = "hasAuthority('" + MediaPermissions.READ + "')";
    private static final String MANAGE = "hasAuthority('" + MediaPermissions.MANAGE + "')";
    private static final int DEFAULT_SIZE = 48;
    private static final int MAX_SIZE = 100;

    static final String FILES_PATH = "/api/admin/media/files/";

    private final MediaService media;
    private final MediaStorage storage;

    record AltTexts(
            @Nullable @Size(max = 250) String tr,
            @Nullable @Size(max = 250) String en,
            @Nullable @Size(max = 250) String ar) {

        static AltTexts of(Map<String, String> byLocale) {
            return new AltTexts(byLocale.get("tr"), byLocale.get("en"), byLocale.get("ar"));
        }

        Map<String, @Nullable String> byLocale() {
            Map<String, @Nullable String> result = new HashMap<>();
            result.put("tr", tr);
            result.put("en", en);
            result.put("ar", ar);
            return result;
        }
    }

    /**
     * {@code url}/{@code thumbnailUrl} are the site's addresses (not served once archived); the preview addresses are
     * the panel's own and keep working for archived images.
     */
    record MediaView(
            long id,
            String url,
            String thumbnailUrl,
            String previewUrl,
            String previewThumbnailUrl,
            String contentType,
            int width,
            int height,
            long byteSize,
            String originalFileName,
            AltTexts altText,
            boolean archived,
            Instant createdAt,
            long version) {

        static MediaView of(MediaAsset asset) {
            return new MediaView(
                    asset.getId(),
                    PublicMediaController.PATH + asset.getFileName(),
                    PublicMediaController.PATH + asset.getThumbnailFileName(),
                    FILES_PATH + asset.getFileName(),
                    FILES_PATH + asset.getThumbnailFileName(),
                    asset.getContentType(),
                    asset.getWidth(),
                    asset.getHeight(),
                    asset.getByteSize(),
                    asset.getOriginalFileName(),
                    AltTexts.of(asset.getAltTexts()),
                    asset.isArchived(),
                    asset.getCreatedAt(),
                    asset.getVersion());
        }
    }

    record UpdateMediaRequest(@NotNull @Valid AltTexts altText, long version) {}

    @GetMapping
    @PreAuthorize(READ)
    PagedModel<MediaView> list(
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_SIZE) int size) {
        return new PagedModel<>(media.list(archived, Math.max(page, 0), Math.clamp(size, 1, MAX_SIZE))
                .map(MediaView::of));
    }

    @GetMapping("/{id}")
    @PreAuthorize(READ)
    MediaView get(@PathVariable long id) {
        return MediaView.of(media.get(id));
    }

    @GetMapping("/files/{fileName}")
    @PreAuthorize(READ)
    ResponseEntity<Resource> file(@PathVariable String fileName) {
        return MediaFiles.respond(fileName, media.findByFile(fileName), storage, MediaFiles.PRIVATE);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(MANAGE)
    MediaView upload(@RequestPart("file") MultipartFile file) {
        return MediaView.of(media.upload(file));
    }

    @PutMapping("/{id}")
    @PreAuthorize(MANAGE)
    MediaView update(@PathVariable long id, @Valid @RequestBody UpdateMediaRequest request) {
        return MediaView.of(media.updateAltTexts(id, request.altText().byLocale(), request.version()));
    }

    @PostMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(MANAGE)
    void archive(@PathVariable long id) {
        media.archive(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(MANAGE)
    void delete(@PathVariable long id) {
        media.delete(id);
    }

    @PostMapping("/{id}/unarchive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(MANAGE)
    void unarchive(@PathVariable long id) {
        media.unarchive(id);
    }
}
