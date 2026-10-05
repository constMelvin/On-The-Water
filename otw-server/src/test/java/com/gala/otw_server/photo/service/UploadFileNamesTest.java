package com.gala.otw_server.photo.service;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UploadFileNamesTest {

    @Test
    @DisplayName("strips paths, control characters and leading dots")
    void cleansName() {
        assertThat(UploadFileNames.clean("..\\..\\etc/passwd\u0000.png", "image/png")).isEqualTo("etc passwd.png");
        assertThat(UploadFileNames.clean(".mov", "video/quicktime")).isEqualTo("upload.mov");
        assertThat(UploadFileNames.clean("Clip.MP4", "video/mp4")).isEqualTo("Clip.mp4");
    }

    @Test
    @DisplayName("caps long names at 200 characters and keeps the extension")
    void capsLength() {
        String cleaned = UploadFileNames.clean("a".repeat(500) + ".webp", "image/webp");
        assertThat(cleaned).hasSize(UploadFileNames.MAX_LENGTH).endsWith(".webp");
    }

    @Test
    @DisplayName("rejects double extensions that end in something not allowed")
    void rejectsDisguisedExtension() {
        assertThatThrownBy(() -> UploadFileNames.clean("cat.jpg.html", "image/jpeg"))
                .isInstanceOf(InvalidRequestException.class);
    }
}
