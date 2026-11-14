package com.burokent.media.library;

/**
 * Reads the EXIF orientation tag of a JPEG straight from its bytes: walks the segments up to the image data, finds the
 * APP1 "Exif" segment and looks up tag 0x0112 in the first TIFF directory. Anything unexpected means "as stored" (1).
 */
final class ExifOrientation {

    private static final int APP1 = 0xE1;
    private static final int START_OF_SCAN = 0xDA;
    private static final int END_OF_IMAGE = 0xD9;
    private static final int ORIENTATION_TAG = 0x0112;
    private static final int SHORT_TYPE = 3;

    private ExifOrientation() {}

    static int read(byte[] jpeg) {
        try {
            return find(jpeg);
        } catch (IndexOutOfBoundsException e) {
            return 1;
        }
    }

    private static int find(byte[] jpeg) {
        if (jpeg.length < 4 || unsigned(jpeg, 0) != 0xFF || unsigned(jpeg, 1) != 0xD8) {
            return 1;
        }
        int position = 2;
        while (position + 4 <= jpeg.length) {
            if (unsigned(jpeg, position) != 0xFF) {
                return 1;
            }
            int marker = unsigned(jpeg, position + 1);
            if (marker == 0xFF) {
                position++;
                continue;
            }
            if (marker == START_OF_SCAN || marker == END_OF_IMAGE) {
                return 1;
            }
            int length = (unsigned(jpeg, position + 2) << 8) | unsigned(jpeg, position + 3);
            int start = position + 4;
            int end = position + 2 + length;
            if (length < 2 || end > jpeg.length) {
                return 1;
            }
            if (marker == APP1 && end - start > 14 && isExifHeader(jpeg, start)) {
                return fromTiff(jpeg, start + 6, end);
            }
            position = end;
        }
        return 1;
    }

    private static boolean isExifHeader(byte[] bytes, int start) {
        return bytes[start] == 'E'
                && bytes[start + 1] == 'x'
                && bytes[start + 2] == 'i'
                && bytes[start + 3] == 'f'
                && bytes[start + 4] == 0
                && bytes[start + 5] == 0;
    }

    private static int fromTiff(byte[] bytes, int base, int end) {
        boolean littleEndian;
        if (bytes[base] == 'I' && bytes[base + 1] == 'I') {
            littleEndian = true;
        } else if (bytes[base] == 'M' && bytes[base + 1] == 'M') {
            littleEndian = false;
        } else {
            return 1;
        }
        long directory = base + uint32(bytes, base + 4, littleEndian);
        if (directory + 2 > end) {
            return 1;
        }
        int entries = uint16(bytes, (int) directory, littleEndian);
        for (int i = 0; i < entries; i++) {
            int entry = (int) directory + 2 + i * 12;
            if (entry + 12 > end) {
                return 1;
            }
            if (uint16(bytes, entry, littleEndian) == ORIENTATION_TAG) {
                if (uint16(bytes, entry + 2, littleEndian) != SHORT_TYPE) {
                    return 1;
                }
                int value = uint16(bytes, entry + 8, littleEndian);
                return value >= 1 && value <= 8 ? value : 1;
            }
        }
        return 1;
    }

    private static int unsigned(byte[] bytes, int index) {
        return bytes[index] & 0xFF;
    }

    private static int uint16(byte[] bytes, int index, boolean littleEndian) {
        int first = unsigned(bytes, index);
        int second = unsigned(bytes, index + 1);
        return littleEndian ? (second << 8) | first : (first << 8) | second;
    }

    private static long uint32(byte[] bytes, int index, boolean littleEndian) {
        long high = uint16(bytes, littleEndian ? index + 2 : index, littleEndian);
        long low = uint16(bytes, littleEndian ? index : index + 2, littleEndian);
        return (high << 16) | low;
    }
}
