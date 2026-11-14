package com.burokent.media.library;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.CRC32;
import java.util.zip.Deflater;
import javax.imageio.ImageIO;

/** Builds small images in memory for the media tests. */
final class TestImages {

    /** A 1×1 lossless WebP (the well-known feature-detection sample). */
    static final byte[] WEBP_1X1 = Base64.getDecoder().decode("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==");

    private TestImages() {}

    /** Left half red, right half blue. */
    static byte[] jpeg(int width, int height) {
        return write(twoColors(width, height, BufferedImage.TYPE_INT_RGB), "jpg");
    }

    static byte[] png(int width, int height, boolean transparent) {
        BufferedImage image = twoColors(width, height, BufferedImage.TYPE_INT_ARGB);
        if (transparent) {
            image.setRGB(0, 0, 0x00FFFFFF);
        }
        return write(image, "png");
    }

    static byte[] gif(int width, int height) {
        return write(twoColors(width, height, BufferedImage.TYPE_INT_RGB), "gif");
    }

    /** A JPEG carrying an EXIF block with the given orientation and an image description. */
    static byte[] jpegWithExif(int width, int height, int orientation, String description) {
        byte[] plain = jpeg(width, height);
        byte[] app1 = exifSegment(orientation, description);
        byte[] result = new byte[plain.length + app1.length];
        // Right after the start-of-image marker
        System.arraycopy(plain, 0, result, 0, 2);
        System.arraycopy(app1, 0, result, 2, app1.length);
        System.arraycopy(plain, 2, result, 2 + app1.length, plain.length - 2);
        return result;
    }

    /** A PNG whose header claims the given size; the pixel data is empty, so it is tiny. */
    static byte[] pngHeaderOnly(int width, int height) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            out.write(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
            ByteBuffer ihdr = ByteBuffer.allocate(13)
                    .putInt(width)
                    .putInt(height)
                    .put((byte) 8)
                    .put((byte) 2)
                    .put((byte) 0)
                    .put((byte) 0)
                    .put((byte) 0);
            chunk(out, "IHDR", ihdr.array());
            Deflater deflater = new Deflater();
            deflater.setInput(new byte[0]);
            deflater.finish();
            byte[] buffer = new byte[64];
            int length = deflater.deflate(buffer);
            byte[] idat = new byte[length];
            System.arraycopy(buffer, 0, idat, 0, length);
            chunk(out, "IDAT", idat);
            chunk(out, "IEND", new byte[0]);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static BufferedImage read(byte[] bytes) {
        try {
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static boolean isRedDominant(int rgb) {
        int red = (rgb >> 16) & 0xFF;
        int blue = rgb & 0xFF;
        return red > 180 && blue < 80;
    }

    static boolean isBlueDominant(int rgb) {
        int red = (rgb >> 16) & 0xFF;
        int blue = rgb & 0xFF;
        return blue > 180 && red < 80;
    }

    private static BufferedImage twoColors(int width, int height, int type) {
        BufferedImage image = new BufferedImage(width, height, type);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(Color.RED);
        graphics.fillRect(0, 0, width / 2, height);
        graphics.setColor(Color.BLUE);
        graphics.fillRect(width / 2, 0, width - width / 2, height);
        graphics.dispose();
        return image;
    }

    private static byte[] write(BufferedImage image, String format) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (!ImageIO.write(image, format, out)) {
                throw new IllegalStateException("No writer for " + format);
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static byte[] exifSegment(int orientation, String description) {
        byte[] text = (description + "\0").getBytes(StandardCharsets.US_ASCII);
        int dataOffset = 8 + 2 + 2 * 12 + 4;
        ByteBuffer tiff = ByteBuffer.allocate(dataOffset + text.length).order(ByteOrder.LITTLE_ENDIAN);
        tiff.put((byte) 'I').put((byte) 'I').putShort((short) 42).putInt(8);
        tiff.putShort((short) 2);
        // ImageDescription (ASCII), stored after the directory
        tiff.putShort((short) 0x010E).putShort((short) 2).putInt(text.length).putInt(dataOffset);
        // Orientation (SHORT), stored inline
        tiff.putShort((short) 0x0112)
                .putShort((short) 3)
                .putInt(1)
                .putShort((short) orientation)
                .putShort((short) 0);
        tiff.putInt(0);
        tiff.put(text);

        byte[] header = "Exif\0\0".getBytes(StandardCharsets.US_ASCII);
        int payload = header.length + tiff.capacity();
        ByteBuffer segment = ByteBuffer.allocate(4 + payload);
        segment.put((byte) 0xFF).put((byte) 0xE1).putShort((short) (payload + 2));
        segment.put(header).put(tiff.array());
        return segment.array();
    }

    private static void chunk(ByteArrayOutputStream out, String type, byte[] data) throws IOException {
        DataOutputStream stream = new DataOutputStream(out);
        byte[] typeBytes = type.getBytes(StandardCharsets.US_ASCII);
        stream.writeInt(data.length);
        stream.write(typeBytes);
        stream.write(data);
        CRC32 crc = new CRC32();
        crc.update(typeBytes);
        crc.update(data);
        stream.writeInt((int) crc.getValue());
    }
}
