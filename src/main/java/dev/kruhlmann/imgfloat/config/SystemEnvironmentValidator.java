package dev.kruhlmann.imgfloat.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Locale;

@Component
public class SystemEnvironmentValidator {
    private static final Logger log = LoggerFactory.getLogger(SystemEnvironmentValidator.class);

    @Value("${spring.security.oauth2.client.registration.twitch.client-id:#{null}}")
    private String twitchClientId;
    @Value("${spring.security.oauth2.client.registration.twitch.client-secret:#{null}}")
    private String twitchClientSecret;
    @Value("${spring.servlet.multipart.max-file-size:#{null}}")
    private String springMaxFileSize;
    @Value("${IMGFLOAT_ASSETS_PATH:#{null}}")
    private String assetsPath;
    @Value("${IMGFLOAT_PREVIEWS_PATH:#{null}}")
    private String previewsPath;

    @PostConstruct
    public void validate() {
        StringBuilder missing = new StringBuilder();

        long maxUploadBytes = parseSizeToBytes(springMaxFileSize);
        checkLong(maxUploadBytes, "SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE", missing);
        checkString(twitchClientId, "TWITCH_CLIENT_ID", missing);
        checkString(twitchClientSecret, "TWITCH_CLIENT_SECRET", missing);
        checkString(assetsPath, "IMGFLOAT_ASSETS_PATH", missing);
        checkString(previewsPath, "IMGFLOAT_PREVIEWS_PATH", missing);

        if (missing.length() > 0) {
            throw new IllegalStateException(
                "Missing or invalid environment variables:\n" + missing
            );
        }

        log.info("Environment validation successful.");
        log.info("Configuration:");
        log.info(" - TWITCH_CLIENT_ID: {}", redact(twitchClientId));
        log.info(" - TWITCH_CLIENT_SECRET: {}", redact(twitchClientSecret));
        log.info(" - SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE: {} ({} bytes)",
            springMaxFileSize,
            maxUploadBytes
        );
        log.info(" - IMGFLOAT_ASSETS_PATH: {}", assetsPath);
        log.info(" - IMGFLOAT_PREVIEWS_PATH: {}", previewsPath);
    }

    private void checkString(String value, String name, StringBuilder missing) {
        if (!StringUtils.hasText(value) || "changeme".equalsIgnoreCase(value.trim())) {
            missing.append(" - ").append(name).append("\n");
        }
    }

    private void checkLong(Long value, String name, StringBuilder missing) {
        if (value == null || value <= 0) {
            missing.append(" - ").append(name).append("\n");
        }
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";

        double kb = bytes / 1024.0;
        if (kb < 1024) return String.format("%.2f KB", kb);

        double mb = kb / 1024.0;
        if (mb < 1024) return String.format("%.2f MB", mb);

        double gb = mb / 1024.0;
        return String.format("%.2f GB", gb);
    }

    private String redact(String value) {
        if (!StringUtils.hasText(value)) return "(missing)";
        if (value.length() <= 6) return "******";
        return value.substring(0, 2) + "****" + value.substring(value.length() - 2);
    }

    private long parseSizeToBytes(String value) {
        if (value == null) return -1;

        String v = value.trim().toUpperCase(Locale.ROOT);

        try {
            if (v.endsWith("GB")) return Long.parseLong(v.replace("GB", "")) * 1024 * 1024 * 1024;
            if (v.endsWith("MB")) return Long.parseLong(v.replace("MB", "")) * 1024 * 1024;
            if (v.endsWith("KB")) return Long.parseLong(v.replace("KB", "")) * 1024;
            if (v.endsWith("B"))  return Long.parseLong(v.replace("B", ""));
            return Long.parseLong(v);
        } catch (NumberFormatException e) {
            return -1;
        }
    }
}
