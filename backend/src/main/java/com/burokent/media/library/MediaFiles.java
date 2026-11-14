package com.burokent.media.library;

import java.time.Duration;
import java.util.Optional;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Builds the response for one stored image file. A name never gets new content, so it may be cached for a year. */
final class MediaFiles {

    static final CacheControl PUBLIC =
            CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();
    static final CacheControl PRIVATE =
            CacheControl.maxAge(Duration.ofDays(365)).cachePrivate().immutable();

    private MediaFiles() {}

    static ResponseEntity<Resource> respond(
            String fileName, Optional<MediaAsset> asset, MediaStorage storage, CacheControl cacheControl) {
        if (!FileSystemMediaStorage.FILE_NAME.matcher(fileName).matches()) {
            return ResponseEntity.notFound().build();
        }
        return asset.flatMap(found -> storage.find(fileName)
                        .map(resource -> ResponseEntity.ok()
                                .cacheControl(cacheControl)
                                .contentType(MediaType.parseMediaType(found.getContentType()))
                                .body(resource)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
