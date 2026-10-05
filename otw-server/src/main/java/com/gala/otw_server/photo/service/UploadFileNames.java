package com.gala.otw_server.photo.service;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;

import java.util.Locale;
import java.util.Set;

/** Cleans the file name a browser sends for a Gala Dump upload and checks its extension. */
final class UploadFileNames {

    static final int MAX_LENGTH = 200;

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp", "heic", "heif");
    private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "mov", "webm", "m4v", "3gp");

    private UploadFileNames() {}

    /**
     * Drops control characters, slashes and leading dots, collapses whitespace, lower-cases the
     * extension and caps the length (keeping the extension), then checks the extension is an allowed photo/video type that matches the MIME
     * type ({@code image/*} or {@code video/*}, already checked by the request's validation).
     */
    static String clean(String fileName, String mimeType) {
        String name = fileName == null ? "" : fileName
                .replaceAll("[\\p{Cntrl}/\\\\]+", " ")
                .replaceAll("\\s+", " ")
                .trim();

        int dot = name.lastIndexOf('.');
        String ext = dot >= 0 ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        Set<String> allowed = mimeType.startsWith("video/") ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS;
        if (!allowed.contains(ext)) {
            throw new InvalidRequestException(mimeType.startsWith("video/")
                    ? "Videos must be .mp4, .mov, .webm, .m4v or .3gp"
                    : "Photos must be .jpg, .jpeg, .png, .gif, .webp, .heic or .heif");
        }

        String base = name.substring(0, dot).replaceAll("^[.\\s]+", "").trim();
        if (base.isEmpty()) base = "upload";
        int maxBase = MAX_LENGTH - ext.length() - 1;
        if (base.length() > maxBase) base = base.substring(0, maxBase).trim();
        return base + "." + ext;
    }
}
