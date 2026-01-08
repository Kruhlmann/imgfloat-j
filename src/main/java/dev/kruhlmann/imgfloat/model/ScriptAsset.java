package dev.kruhlmann.imgfloat.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "script_assets")
public class ScriptAsset {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    private String mediaType;
    private String originalMediaType;

    public ScriptAsset() {}

    public ScriptAsset(String assetId, String name) {
        this.id = assetId;
        this.name = name;
    }

    @PrePersist
    @PreUpdate
    public void prepare() {
        if (this.name == null || this.name.isBlank()) {
            this.name = this.id;
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public String getOriginalMediaType() {
        return originalMediaType;
    }

    public void setOriginalMediaType(String originalMediaType) {
        this.originalMediaType = originalMediaType;
    }
}
