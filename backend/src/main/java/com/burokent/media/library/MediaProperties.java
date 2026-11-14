package com.burokent.media.library;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Where the image files are kept: a Docker volume in production. */
@ConfigurationProperties("burokent.media")
record MediaProperties(Path root) {}
