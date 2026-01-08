export function isAudioAsset(asset) {
    if (!asset) {
        console.warn("isAudioAsset called with null or undefined asset");
    }
    const type = asset?.mediaType || asset?.originalMediaType || "";
    return type.startsWith("audio/");
}
