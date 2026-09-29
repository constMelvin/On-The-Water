package com.gala.otw_server.config;

import com.gala.otw_server.photo.service.GoogleDriveFileValidator;
import com.google.api.services.drive.Drive;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Confirms the app context boots cleanly when Google Drive credentials are
 * NOT configured (the default in local dev/CI): GoogleDriveConfig.googleDriveClient()
 * returns null instead of registering a Drive bean, and the
 * @Autowired(required = false) consumer (GoogleDriveFileValidator) must not
 * blow up context refresh over the missing bean.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, classes = GoogleDriveConfigTest.TestConfig.class)
class GoogleDriveConfigTest {

    @Import({GoogleDriveConfig.class, GoogleDriveFileValidator.class})
    static class TestConfig {}

    @Autowired(required = false)
    private Drive drive;

    @Autowired
    private GoogleDriveFileValidator validator;

    @Test
    void contextLoadsWithoutDriveCredentials_andNoDriveBeanIsRegistered() {
        assertThat(drive).isNull();
        assertThat(validator).isNotNull();
    }
}
