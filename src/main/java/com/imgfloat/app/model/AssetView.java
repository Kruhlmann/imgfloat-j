package com.imgfloat.app.model;

import java.time.Instant;

public record AssetView(
        String id,
        String broadcaster,
        String name,
        String url,
        double x,
        double y,
        double width,
        double height,
        double rotation,
        Double speed,
        Boolean muted,
        String mediaType,
        String originalMediaType,
        Integer zIndex,
        boolean hidden,
        Instant createdAt
) {
    public static AssetView from(String broadcaster, Asset asset) {
        return new AssetView(
                asset.getId(),
                asset.getBroadcaster(),
                asset.getName(),
                "/api/channels/" + broadcaster + "/assets/" + asset.getId() + "/content",
                asset.getX(),
                asset.getY(),
                asset.getWidth(),
                asset.getHeight(),
                asset.getRotation(),
                asset.getSpeed(),
                asset.isMuted(),
                asset.getMediaType(),
                asset.getOriginalMediaType(),
                asset.getZIndex(),
                asset.isHidden(),
                asset.getCreatedAt()
        );
    }
}
