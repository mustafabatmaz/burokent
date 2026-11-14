package com.burokent.media.library;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where the image files are kept: a Docker volume in production, a folder relative to the backend in development. A
 * plain string: bound to {@code Path}, a relative value would be read as a servlet-context resource and rejected.
 */
@ConfigurationProperties("burokent.media")
record MediaProperties(String root) {}
