package com.burokent.media.library;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {

    Page<MediaAsset> findByArchivedAtIsNull(Pageable pageable);

    Page<MediaAsset> findByArchivedAtIsNotNull(Pageable pageable);

    Optional<MediaAsset> findByFileNameOrThumbnailFileName(String fileName, String thumbnailFileName);
}
