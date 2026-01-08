export function isAudioAsset(asset) {
    if (!asset) {
        console.warn("isAudioAsset called with null or undefined asset");
    }
    if (asset?.assetType) {
        return asset.assetType === "AUDIO";
    }
    const type = asset?.mediaType || asset?.originalMediaType || "";
    return type.startsWith("audio/");
}
