package com.burokent.media.library;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.burokent.shared.ProblemException;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ImageProcessorTests {

    private final ImageProcessor processor = new ImageProcessor();

    @Test
    void appliesTheExifOrientationAndDropsAllMetadata() {
        byte[] upload = TestImages.jpegWithExif(200, 100, 6, "secret-location");
        assertThat(contains(upload, "secret-location")).isTrue();

        ProcessedImage result = processor.process(upload);

        assertThat(result.contentType()).isEqualTo("image/jpeg");
        assertThat(result.extension()).isEqualTo("jpg");
        // Orientation 6: turned a quarter clockwise, so the stored left half (red) ends up on top
        assertThat(result.width()).isEqualTo(100);
        assertThat(result.height()).isEqualTo(200);
        BufferedImage master = TestImages.read(result.master());
        assertThat(TestImages.isRedDominant(master.getRGB(50, 20))).isTrue();
        assertThat(TestImages.isBlueDominant(master.getRGB(50, 180))).isTrue();
        for (byte[] stored : new byte[][] {result.master(), result.thumbnail()}) {
            assertThat(contains(stored, "secret-location")).isFalse();
            assertThat(contains(stored, "Exif")).isFalse();
        }
    }

    @Test
    void limitsTheLongSideOfBothCopies() {
        ProcessedImage result = processor.process(TestImages.jpeg(4000, 2000));

        assertThat(result.width()).isEqualTo(3000);
        assertThat(result.height()).isEqualTo(1500);
        BufferedImage master = TestImages.read(result.master());
        assertThat(master.getWidth()).isEqualTo(3000);
        BufferedImage thumbnail = TestImages.read(result.thumbnail());
        assertThat(thumbnail.getWidth()).isEqualTo(400);
        assertThat(thumbnail.getHeight()).isEqualTo(200);
    }

    @Test
    void neverEnlargesSmallImages() {
        ProcessedImage result = processor.process(TestImages.jpeg(300, 120));

        assertThat(result.width()).isEqualTo(300);
        assertThat(TestImages.read(result.thumbnail()).getWidth()).isEqualTo(300);
    }

    @Test
    void keepsTransparentImagesAsPng() {
        ProcessedImage result = processor.process(TestImages.png(64, 32, true));

        assertThat(result.contentType()).isEqualTo("image/png");
        assertThat(result.extension()).isEqualTo("png");
        assertThat(TestImages.read(result.master()).getColorModel().hasAlpha()).isTrue();
    }

    @Test
    void storesOpaquePngsAsJpeg() {
        ProcessedImage result = processor.process(TestImages.png(64, 32, false));

        assertThat(result.contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void readsWebp() {
        ProcessedImage result = processor.process(TestImages.WEBP_1X1);

        assertThat(result.width()).isEqualTo(1);
        assertThat(result.height()).isEqualTo(1);
    }

    @Test
    void rejectsOtherFormatsByContent() {
        assertProblem(TestImages.gif(10, 10), "media_type_unsupported");
        assertProblem("not an image at all".getBytes(StandardCharsets.UTF_8), "media_type_unsupported");
    }

    @Test
    void rejectsHugeImagesBeforeDecodingThem() {
        assertProblem(TestImages.pngHeaderOnly(10_000, 10_000), "media_too_many_pixels");
    }

    private void assertProblem(byte[] upload, String code) {
        assertThatThrownBy(() -> processor.process(upload))
                .isInstanceOfSatisfying(
                        ProblemException.class,
                        problem -> assertThat(problem.code()).isEqualTo(code));
    }

    private static boolean contains(byte[] haystack, String needle) {
        return new String(haystack, StandardCharsets.ISO_8859_1).contains(needle);
    }
}
