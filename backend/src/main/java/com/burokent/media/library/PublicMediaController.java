package com.burokent.media.library;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the image files to the site. Browsers, Cloudflare and the site's image optimizer may keep a file for a year.
 * Archived images are no longer served here; the panel reaches them through its own address.
 */
@RestController
@RequiredArgsConstructor
class PublicMediaController {

    static final String PATH = "/api/public/media/";

    private final MediaService media;
    private final MediaStorage storage;

    @GetMapping(PATH + "{fileName}")
    ResponseEntity<Resource> file(@PathVariable String fileName) {
        return MediaFiles.respond(fileName, media.findServable(fileName), storage, MediaFiles.PUBLIC);
    }
}
