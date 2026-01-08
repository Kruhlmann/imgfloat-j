package dev.kruhlmann.imgfloat.model;

import jakarta.validation.constraints.NotBlank;

public class CodeAssetRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String source;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
