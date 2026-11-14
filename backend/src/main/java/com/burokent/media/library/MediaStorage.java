package com.burokent.media.library;

import java.util.Optional;
import org.springframework.core.io.Resource;

/** Keeps image files by name. A file is written once and never changed. */
interface MediaStorage {

    void save(String fileName, byte[] content);

    Optional<Resource> find(String fileName);

    void delete(String fileName);
}
