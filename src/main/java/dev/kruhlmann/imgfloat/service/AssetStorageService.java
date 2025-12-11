package dev.kruhlmann.imgfloat.service;

import dev.kruhlmann.imgfloat.service.media.AssetContent;
import dev.kruhlmann.imgfloat.model.Asset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class AssetStorageService {
    private static final Logger logger = LoggerFactory.getLogger(AssetStorageService.class);
    private static final Map<String, String> EXTENSIONS = Map.ofEntries(
        Map.entry("image/png", ".png"),
        Map.entry("image/jpeg", ".jpg"),
        Map.entry("image/jpg", ".jpg"),
        Map.entry("image/gif", ".gif"),
        Map.entry("image/webp", ".webp"),
        Map.entry("image/bmp", ".bmp"),
        Map.entry("image/tiff", ".tiff"),
        Map.entry("video/mp4", ".mp4"),
        Map.entry("video/webm", ".webm"),
        Map.entry("video/quicktime", ".mov"),
        Map.entry("video/x-matroska", ".mkv"),
        Map.entry("audio/mpeg", ".mp3"),
        Map.entry("audio/mp3", ".mp3"),
        Map.entry("audio/wav", ".wav"),
        Map.entry("audio/ogg", ".ogg"),
        Map.entry("audio/webm", ".webm"),
        Map.entry("audio/flac", ".flac")
    );

    private final Path assetRoot;
    private final Path previewRoot;

    public AssetStorageService(
            @Value("${IMGFLOAT_ASSETS_PATH:#{null}}") String assetRoot,
            @Value("${IMGFLOAT_PREVIEWS_PATH:#{null}}") String previewRoot
    ) {
        this.assetRoot = Paths.get(assetRoot).normalize().toAbsolutePath();
        this.previewRoot = Paths.get(previewRoot).normalize().toAbsolutePath();
    }

    public String storeAsset(String broadcaster, String assetId, byte[] assetBytes, String mediaType)
            throws IOException {

        if (assetBytes == null || assetBytes.length == 0) {
            throw new IOException("Asset content is empty");
        }

        String safeUser = sanitizeUserSegment(broadcaster);
        Path directory = safeJoin(assetRoot, safeUser);
        Files.createDirectories(directory);

        String extension = resolveExtension(mediaType);
        Path file = directory.resolve(assetId + extension);

        Files.write(file, assetBytes,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE);

        return assetRoot.relativize(file).toString();
    }

    public String storePreview(String broadcaster, String assetId, byte[] previewBytes)
            throws IOException {

        if (previewBytes == null || previewBytes.length == 0) {
            return null;
        }

        String safeUser = sanitizeUserSegment(broadcaster);
        Path directory = safeJoin(previewRoot, safeUser);
        Files.createDirectories(directory);

        Path file = directory.resolve(assetId + ".png");

        Files.write(file, previewBytes,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE);

        return previewRoot.relativize(file).toString();
    }

    public Optional<AssetContent> loadAssetFile(String relativePath, String mediaType) {
        if (relativePath == null || relativePath.isBlank()) return Optional.empty();

        try {
            Path file = safeJoin(assetRoot, relativePath);

            if (!Files.exists(file)) return Optional.empty();

            String resolved = mediaType;
            if (resolved == null || resolved.isBlank()) {
                resolved = Files.probeContentType(file);
            }
            if (resolved == null || resolved.isBlank()) {
                resolved = "application/octet-stream";
            }

            byte[] bytes = Files.readAllBytes(file);
            return Optional.of(new AssetContent(bytes, resolved));

        } catch (Exception e) {
            logger.warn("Failed to load asset {}", relativePath, e);
            return Optional.empty();
        }
    }

    public Optional<AssetContent> loadPreview(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return Optional.empty();

        try {
            Path file = safeJoin(previewRoot, relativePath);

            if (!Files.exists(file)) return Optional.empty();

            byte[] bytes = Files.readAllBytes(file);
            return Optional.of(new AssetContent(bytes, "image/png"));

        } catch (Exception e) {
            logger.warn("Failed to load preview {}", relativePath, e);
            return Optional.empty();
        }
    }

    public Optional<AssetContent> loadAssetFileSafely(Asset asset) {
        if (asset.getUrl() == null) return Optional.empty();
        return loadAssetFile(asset.getUrl(), asset.getMediaType());
    }

    public Optional<AssetContent> loadPreviewSafely(Asset asset) {
        if (asset.getPreview() == null) return Optional.empty();
        return loadPreview(asset.getPreview());
    }

    public void deleteAssetFile(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;

        try {
            Path file = safeJoin(assetRoot, relativePath);
            Files.deleteIfExists(file);
        } catch (Exception e) {
            logger.warn("Failed to delete asset {}", relativePath, e);
        }
    }

    public void deletePreviewFile(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;

        try {
            Path file = safeJoin(previewRoot, relativePath);
            Files.deleteIfExists(file);
        } catch (Exception e) {
            logger.warn("Failed to delete preview {}", relativePath, e);
        }
    }

    private String sanitizeUserSegment(String value) {
        if (value == null) throw new IllegalArgumentException("Broadcaster is null");

        String safe = value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_-]", "");
        if (safe.isBlank()) throw new IllegalArgumentException("Invalid broadcaster: " + value);
        return safe;
    }

    private String resolveExtension(String mediaType) throws IOException {
        if (mediaType == null || !EXTENSIONS.containsKey(mediaType)) {
            throw new IOException("Unsupported media type: " + mediaType);
        }
        return EXTENSIONS.get(mediaType);
    }

    /**
     * Safe path-join that prevents path traversal.
     * Accepts both "abc/123.png" (relative multi-level) and single components.
     */
    private Path safeJoin(Path root, String relative) throws IOException {
        Path resolved = root.resolve(relative).normalize();
        if (!resolved.startsWith(root)) {
            throw new IOException("Path traversal attempt: " + relative);
        }
        return resolved;
    }
}
