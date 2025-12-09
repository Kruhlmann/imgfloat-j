package com.imgfloat.app.model;

public class AssetEvent {
    public enum Type {
        CREATED,
        UPDATED,
        VISIBILITY,
        DELETED
    }

    private Type type;
    private String channel;
    private AssetView payload;
    private String assetId;

    public static AssetEvent created(String channel, AssetView asset) {
        AssetEvent event = new AssetEvent();
        event.type = Type.CREATED;
        event.channel = channel;
        event.payload = asset;
        event.assetId = asset.id();
        return event;
    }

    public static AssetEvent updated(String channel, AssetView asset) {
        AssetEvent event = new AssetEvent();
        event.type = Type.UPDATED;
        event.channel = channel;
        event.payload = asset;
        event.assetId = asset.id();
        return event;
    }

    public static AssetEvent visibility(String channel, AssetView asset) {
        AssetEvent event = new AssetEvent();
        event.type = Type.VISIBILITY;
        event.channel = channel;
        event.payload = asset;
        event.assetId = asset.id();
        return event;
    }

    public static AssetEvent deleted(String channel, String assetId) {
        AssetEvent event = new AssetEvent();
        event.type = Type.DELETED;
        event.channel = channel;
        event.assetId = assetId;
        return event;
    }

    public Type getType() {
        return type;
    }

    public String getChannel() {
        return channel;
    }

    public AssetView getPayload() {
        return payload;
    }

    public String getAssetId() {
        return assetId;
    }
}
