package com.burokent.media.library;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.BatchSize;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "media_assets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;

    private String thumbnailFileName;

    private String contentType;

    private int width;

    private int height;

    private long byteSize;

    private String originalFileName;

    /** Alt text per locale (tr, en, ar); a missing locale has no row. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "media_translations", joinColumns = @JoinColumn(name = "media_id"))
    @MapKeyColumn(name = "locale")
    @Column(name = "alt_text")
    @BatchSize(size = 100)
    private Map<String, String> altTexts = new HashMap<>();

    private Instant createdAt;

    private Instant updatedAt;

    private @Nullable Instant archivedAt;

    @Version
    private long version;

    MediaAsset(String baseName, ProcessedImage image, String originalFileName, Instant now) {
        this.fileName = baseName + "." + image.extension();
        this.thumbnailFileName = baseName + "-400." + image.extension();
        this.contentType = image.contentType();
        this.width = image.width();
        this.height = image.height();
        this.byteSize = image.master().length;
        this.originalFileName = originalFileName;
        this.createdAt = now;
        this.updatedAt = now;
    }

    boolean isArchived() {
        return archivedAt != null;
    }

    void updateAltTexts(Map<String, String> newAltTexts, Instant now) {
        altTexts.clear();
        altTexts.putAll(newAltTexts);
        updatedAt = now;
    }

    void archive(Instant now) {
        archivedAt = now;
        updatedAt = now;
    }

    void unarchive(Instant now) {
        archivedAt = null;
        updatedAt = now;
    }
}
