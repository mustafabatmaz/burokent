package com.burokent.media.library;

import com.burokent.audit.AuditEntry;
import com.burokent.shared.ProblemException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
class MediaService {

    static final long MAX_BYTES = 20L * 1024 * 1024;
    static final List<String> LOCALES = List.of("tr", "en", "ar");
    private static final int MAX_ORIGINAL_NAME = 255;
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final MediaAssetRepository media;
    private final ImageProcessor processor;
    private final MediaStorage storage;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    /** Decoding a large photo takes a lot of memory: one at a time. */
    private final Semaphore processing = new Semaphore(1);

    @Transactional(readOnly = true)
    Page<MediaAsset> list(boolean archived, int page, int size) {
        PageRequest request = PageRequest.of(page, size, NEWEST_FIRST);
        return archived ? media.findByArchivedAtIsNotNull(request) : media.findByArchivedAtIsNull(request);
    }

    @Transactional(readOnly = true)
    MediaAsset get(long id) {
        return find(id);
    }

    /** A file the site may show: known and not archived. */
    @Transactional(readOnly = true)
    Optional<MediaAsset> findServable(String fileName) {
        return findByFile(fileName).filter(asset -> !asset.isArchived());
    }

    /** Any known file, archived ones included: the panel still shows them. */
    @Transactional(readOnly = true)
    Optional<MediaAsset> findByFile(String fileName) {
        return media.findByFileNameOrThumbnailFileName(fileName, fileName);
    }

    @Transactional
    MediaAsset upload(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ProblemException(HttpStatus.BAD_REQUEST, "media_file_empty");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ProblemException(HttpStatus.CONTENT_TOO_LARGE, "media_file_too_large");
        }
        ProcessedImage image = processExclusively(bytes(file));

        MediaAsset asset = new MediaAsset(UUID.randomUUID().toString(), image, originalName(file), clock.instant());
        storage.save(asset.getFileName(), image.master());
        storage.save(asset.getThumbnailFileName(), image.thumbnail());
        removeFilesUnlessCommitted(asset);
        MediaAsset saved = media.saveAndFlush(asset);

        events.publishEvent(entry("media.uploaded", saved)
                .withChange("fileName", null, saved.getFileName())
                .withChange("size", null, saved.getWidth() + "x" + saved.getHeight()));
        return saved;
    }

    @Transactional
    MediaAsset updateAltTexts(long id, Map<String, @Nullable String> altTexts, long version) {
        MediaAsset asset = find(id);
        if (asset.getVersion() != version) {
            throw new ProblemException(HttpStatus.CONFLICT, "conflict");
        }
        Map<String, String> cleaned = new LinkedHashMap<>();
        AuditEntry entry = entry("media.updated", asset);
        for (String locale : LOCALES) {
            String value = altTexts.get(locale);
            String trimmed = value == null || value.isBlank() ? null : value.trim();
            if (trimmed != null) {
                cleaned.put(locale, trimmed);
            }
            entry = entry.withChange("altText." + locale, asset.getAltTexts().get(locale), trimmed);
        }
        asset.updateAltTexts(cleaned, clock.instant());
        MediaAsset saved = media.saveAndFlush(asset);
        events.publishEvent(entry);
        return saved;
    }

    @Transactional
    void archive(long id) {
        MediaAsset asset = find(id);
        if (asset.isArchived()) {
            return;
        }
        asset.archive(clock.instant());
        media.saveAndFlush(asset);
        events.publishEvent(entry("media.archived", asset));
    }

    @Transactional
    void unarchive(long id) {
        MediaAsset asset = find(id);
        if (!asset.isArchived()) {
            return;
        }
        asset.unarchive(clock.instant());
        media.saveAndFlush(asset);
        events.publishEvent(entry("media.unarchived", asset));
    }

    /**
     * Removes a hidden image for good: an image still shown on the site cannot be deleted. The files go only after the
     * record is gone for sure; the activity log keeps who deleted what.
     */
    @Transactional
    void delete(long id) {
        MediaAsset asset = find(id);
        if (!asset.isArchived()) {
            throw new ProblemException(HttpStatus.CONFLICT, "media_not_hidden");
        }
        AuditEntry entry = entry("media.deleted", asset).withChange("fileName", asset.getFileName(), null);
        media.delete(asset);
        media.flush();
        removeFilesAfterCommit(asset);
        events.publishEvent(entry);
    }

    private MediaAsset find(long id) {
        return media.findById(id).orElseThrow(() -> new ProblemException(HttpStatus.NOT_FOUND, "not_found"));
    }

    private ProcessedImage processExclusively(byte[] upload) {
        try {
            if (!processing.tryAcquire(30, TimeUnit.SECONDS)) {
                throw new ProblemException(HttpStatus.SERVICE_UNAVAILABLE, "media_busy");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ProblemException(HttpStatus.SERVICE_UNAVAILABLE, "media_busy");
        }
        try {
            return processor.process(upload);
        } finally {
            processing.release();
        }
    }

    /** Files written for an upload whose record never got saved would be orphans. */
    private void removeFilesUnlessCommitted(MediaAsset asset) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    storage.delete(asset.getFileName());
                    storage.delete(asset.getThumbnailFileName());
                }
            }
        });
    }

    private void removeFilesAfterCommit(MediaAsset asset) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                storage.delete(asset.getFileName());
                storage.delete(asset.getThumbnailFileName());
            }
        });
    }

    private static byte[] bytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Only the last path segment, without control characters; kept to help find the photo again. */
    private static String originalName(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name == null) {
            return "image";
        }
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1)
                .replaceAll("\\p{Cntrl}", "")
                .strip();
        if (name.isEmpty()) {
            return "image";
        }
        return name.length() > MAX_ORIGINAL_NAME ? name.substring(0, MAX_ORIGINAL_NAME) : name;
    }

    private static AuditEntry entry(String action, MediaAsset asset) {
        return AuditEntry.of(action, "media", asset.getId().toString(), asset.getOriginalFileName());
    }
}
