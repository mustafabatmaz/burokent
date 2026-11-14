package com.burokent.media.library;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/** Stores the files flat in one directory. Names are generated here, so only that exact shape is accepted. */
@Component
@EnableConfigurationProperties(MediaProperties.class)
class FileSystemMediaStorage implements MediaStorage {

    static final Pattern FILE_NAME = Pattern.compile("[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}(-400)?\\.(jpg|png)");

    private final Path root;

    FileSystemMediaStorage(MediaProperties properties) throws IOException {
        this.root = Path.of(properties.root()).toAbsolutePath().normalize();
        Files.createDirectories(root);
        if (!Files.isWritable(root)) {
            throw new IllegalStateException("Media directory is not writable: " + root);
        }
    }

    @Override
    public void save(String fileName, byte[] content) {
        Path target = resolve(fileName);
        try {
            // Written next to the target and then moved, so a reader never sees half a file
            Path temporary = Files.createTempFile(root, ".upload-", ".tmp");
            try {
                Files.write(temporary, content);
                Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temporary);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public Optional<Resource> find(String fileName) {
        Path file = resolve(fileName);
        return Files.isRegularFile(file) ? Optional.of(new FileSystemResource(file)) : Optional.empty();
    }

    @Override
    public void delete(String fileName) {
        try {
            Files.deleteIfExists(resolve(fileName));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private Path resolve(String fileName) {
        if (!FILE_NAME.matcher(fileName).matches()) {
            throw new IllegalArgumentException("Not a media file name");
        }
        return root.resolve(fileName);
    }
}
