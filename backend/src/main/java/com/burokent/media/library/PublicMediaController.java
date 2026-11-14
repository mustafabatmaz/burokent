package com.burokent.media.library;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the image files to the site and the panel. A file under a given name never changes, so browsers, Cloudflare
 * and the site's image optimizer may keep it for a year. Archived images are no longer served.
 */
@RestController
@RequiredArgsConstructor
class PublicMediaController {

    static final String PATH = "/api/public/media/";

    private static final CacheControl FOREVER =
            CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();

    private final MediaService media;
    private final MediaStorage storage;

    @GetMapping(PATH + "{fileName}")
    ResponseEntity<Resource> file(@PathVariable String fileName) {
        if (!FileSystemMediaStorage.FILE_NAME.matcher(fileName).matches()) {
            return ResponseEntity.notFound().build();
        }
        return media.findServable(fileName)
                .flatMap(asset -> storage.find(fileName)
                        .map(resource -> ResponseEntity.ok()
                                .cacheControl(FOREVER)
                                .contentType(MediaType.parseMediaType(asset.getContentType()))
                                .body(resource)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
