package com.burokent.media.library;

import com.burokent.shared.ProblemException;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Turns an uploaded JPEG, PNG or WebP into a large and a small copy. The image is decoded and written anew, so nothing
 * of the original file survives except its pixels: no EXIF, no GPS position, no camera details. The format is decided
 * by the content, never by the file name.
 */
@Component
class ImageProcessor {

    static final int MASTER_SIZE = 3000;
    static final int THUMBNAIL_SIZE = 400;
    /** Checked from the header before decoding, so a small file can't claim a huge picture and fill the memory. */
    static final long MAX_PIXELS = 40_000_000L;

    private static final Set<String> FORMATS = Set.of("jpeg", "png", "webp");
    private static final float JPEG_QUALITY = 0.88f;

    ImageProcessor() {
        // Decode in memory; no temporary files
        ImageIO.setUseCache(false);
    }

    ProcessedImage process(byte[] upload) {
        Decoded decoded = decode(upload);
        BufferedImage image = decoded.format().equals("jpeg")
                ? orient(decoded.image(), ExifOrientation.read(upload))
                : normalize(decoded.image());

        BufferedImage master = scale(image, MASTER_SIZE);
        BufferedImage thumbnail = scale(master, THUMBNAIL_SIZE);
        if (hasTransparency(master)) {
            return new ProcessedImage(
                    png(master), png(thumbnail), "image/png", "png", master.getWidth(), master.getHeight());
        }
        return new ProcessedImage(
                jpeg(master), jpeg(thumbnail), "image/jpeg", "jpg", master.getWidth(), master.getHeight());
    }

    private record Decoded(BufferedImage image, String format) {}

    private static Decoded decode(byte[] upload) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(upload))) {
            Iterator<ImageReader> readers = input == null ? null : ImageIO.getImageReaders(input);
            if (readers == null || !readers.hasNext()) {
                throw unsupported();
            }
            ImageReader reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!FORMATS.contains(format)) {
                    throw unsupported();
                }
                reader.setInput(input, true, true);
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_PIXELS) {
                    throw new ProblemException(HttpStatus.BAD_REQUEST, "media_too_many_pixels");
                }
                return new Decoded(reader.read(0), format);
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException | IllegalStateException | IndexOutOfBoundsException e) {
            throw new ProblemException(HttpStatus.BAD_REQUEST, "media_unreadable");
        }
    }

    private static ProblemException unsupported() {
        return new ProblemException(HttpStatus.BAD_REQUEST, "media_type_unsupported");
    }

    /** Any colour model (CMYK, grey, palette) becomes plain RGB, with alpha only when the image has it. */
    private static BufferedImage normalize(BufferedImage source) {
        return orient(source, 1);
    }

    /** Applies the EXIF orientation (1 to 8) and normalizes the colour model on the way. */
    private static BufferedImage orient(BufferedImage source, int orientation) {
        int w = source.getWidth();
        int h = source.getHeight();
        boolean swap = orientation >= 5;
        AffineTransform transform = switch (orientation) {
            case 2 -> new AffineTransform(-1, 0, 0, 1, w, 0);
            case 3 -> new AffineTransform(-1, 0, 0, -1, w, h);
            case 4 -> new AffineTransform(1, 0, 0, -1, 0, h);
            case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
            case 6 -> new AffineTransform(0, 1, -1, 0, h, 0);
            case 7 -> new AffineTransform(0, -1, -1, 0, h, w);
            case 8 -> new AffineTransform(0, -1, 1, 0, 0, w);
            default -> new AffineTransform();
        };
        BufferedImage target =
                blank(swap ? h : w, swap ? w : h, source.getColorModel().hasAlpha());
        Graphics2D graphics = target.createGraphics();
        graphics.drawImage(source, transform, null);
        graphics.dispose();
        return target;
    }

    /** Shrinks so the longer side is at most {@code maxSide}, halving step by step for a sharp result. */
    private static BufferedImage scale(BufferedImage source, int maxSide) {
        int longSide = Math.max(source.getWidth(), source.getHeight());
        if (longSide <= maxSide) {
            return source;
        }
        int targetWidth = Math.max(1, Math.round((float) source.getWidth() * maxSide / longSide));
        int targetHeight = Math.max(1, Math.round((float) source.getHeight() * maxSide / longSide));
        BufferedImage current = source;
        int width = source.getWidth();
        int height = source.getHeight();
        do {
            width = Math.max(targetWidth, width / 2);
            height = Math.max(targetHeight, height / 2);
            current = resize(current, width, height);
        } while (width != targetWidth || height != targetHeight);
        return current;
    }

    private static BufferedImage resize(BufferedImage source, int width, int height) {
        BufferedImage target = blank(width, height, source.getColorModel().hasAlpha());
        Graphics2D graphics = target.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.drawImage(source, 0, 0, width, height, null);
        graphics.dispose();
        return target;
    }

    private static BufferedImage blank(int width, int height, boolean alpha) {
        return new BufferedImage(width, height, alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
    }

    private static boolean hasTransparency(BufferedImage image) {
        if (!image.getColorModel().hasAlpha()) {
            return false;
        }
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                if ((image.getRGB(x, y) >>> 24) != 0xFF) {
                    return true;
                }
            }
        }
        return false;
    }

    private static byte[] jpeg(BufferedImage image) {
        BufferedImage rgb = image;
        if (image.getColorModel().hasAlpha()) {
            rgb = blank(image.getWidth(), image.getHeight(), false);
            Graphics2D graphics = rgb.createGraphics();
            graphics.drawImage(image, 0, 0, Color.WHITE, null);
            graphics.dispose();
        }
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream output = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(output);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new IIOImage(rgb, null, null), param);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }

    private static byte[] png(BufferedImage image) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            ImageIO.write(image, "png", out);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }
}
