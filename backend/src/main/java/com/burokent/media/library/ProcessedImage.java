package com.burokent.media.library;

/** An upload after re-encoding: the large copy, the small copy and what they are. */
record ProcessedImage(byte[] master, byte[] thumbnail, String contentType, String extension, int width, int height) {}
