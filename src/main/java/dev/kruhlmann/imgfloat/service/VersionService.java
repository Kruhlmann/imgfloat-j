package dev.kruhlmann.imgfloat.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

@Component
public class VersionService {
    private static final Logger LOG = LoggerFactory.getLogger(VersionService.class);
    private final String version;
    private final String releaseVersion;

    public VersionService() {
        this.version = resolveVersion();
        this.releaseVersion = normalizeReleaseVersion(this.version);
    }

    public String getVersion() {
        return version;
    }

    public String getReleaseVersion() {
        return releaseVersion;
    }

    private String resolveVersion() {
        String manifestVersion = getClass().getPackage().getImplementationVersion();
        if (manifestVersion != null && !manifestVersion.isBlank()) {
            return manifestVersion;
        }

        String pomVersion = getPomVersion();
        if (pomVersion != null && !pomVersion.isBlank()) {
            return pomVersion;
        }

        String gitDescribeVersion = getGitVersionString();
        if (gitDescribeVersion != null) {
            return "git-" + gitDescribeVersion;
        }

        return "unknown";
    }

    private String normalizeReleaseVersion(String baseVersion) {
        if (baseVersion == null || baseVersion.isBlank()) {
            return "latest";
        }

        String normalized = baseVersion.trim();
        normalized = normalized.replaceFirst("^git-", "");
        normalized = normalized.replaceFirst("(?i)^v", "");
        normalized = normalized.replaceFirst("-SNAPSHOT$", "");
        if (normalized.isBlank()) {
            return "latest";
        }
        return normalized;
    }

    private String getPomVersion() {
        try (var inputStream = getClass().getResourceAsStream("/META-INF/maven/dev.kruhlmann/imgfloat/pom.properties")) {
            if (inputStream == null) {
                return null;
            }
            var properties = new java.util.Properties();
            properties.load(inputStream);
            String pomVersion = properties.getProperty("version");
            if (pomVersion != null && !pomVersion.isBlank()) {
                return pomVersion.trim();
            }
        } catch (IOException e) {
            LOG.warn("Unable to read version from pom.properties", e);
        }
        return null;
    }

    private String getGitVersionString() {
        try {
            Process check = new ProcessBuilder("git", "--version")
                    .redirectErrorStream(true)
                    .start();

            if (check.waitFor() != 0) {
                LOG.info("git not found on PATH, skipping git version detection");
                return null;
            }
        } catch (Exception e) {
            LOG.info("git not found on PATH, skipping git version detection");
            return null;
        }

        Process process = null;
        try {
            process = new ProcessBuilder("git", "describe", "--tags", "--always")
                    .redirectErrorStream(true)
                    .start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String result = reader.readLine();
                int exitCode = process.waitFor();
                if (exitCode == 0 && result != null && !result.isBlank()) {
                    return result.trim();
                }
                LOG.warn("git describe returned exit code {} with output: {}", exitCode, result);
            }
        } catch (IOException e) {
            LOG.warn("Unable to determine git version using git describe", e);
            if (process != null) {
                process.destroyForcibly();
            }
        } catch (InterruptedException e) {
            LOG.warn("Interrupted while determining git version", e);
            if (process != null) {
                process.destroyForcibly();
            }
            Thread.currentThread().interrupt();
        }
        return null;
    }
}
