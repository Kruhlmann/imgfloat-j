import { isVisualAsset } from "./assetKinds.js";

export function ensureLayerPosition(state, assetId, placement = "keep") {
    const asset = state.assets.get(assetId);
    if (asset && !isVisualAsset(asset)) {
        return;
    }
    const existingIndex = state.layerOrder.indexOf(assetId);
    if (existingIndex !== -1 && placement === "keep") {
        return;
    }
    if (existingIndex !== -1) {
        state.layerOrder.splice(existingIndex, 1);
    }
    if (placement === "append") {
        state.layerOrder.push(assetId);
    } else {
        state.layerOrder.unshift(assetId);
    }
    state.layerOrder = state.layerOrder.filter((id) => state.assets.has(id));
}

export function getLayerOrder(state) {
    state.layerOrder = state.layerOrder.filter((id) => {
        const asset = state.assets.get(id);
        return asset && isVisualAsset(asset);
    });
    state.assets.forEach((asset, id) => {
        if (!isVisualAsset(asset)) {
            return;
        }
        if (!state.layerOrder.includes(id)) {
            state.layerOrder.unshift(id);
        }
    });
    return state.layerOrder;
}

export function getRenderOrder(state) {
    return [...getLayerOrder(state)]
        .reverse()
        .map((id) => state.assets.get(id))
        .filter(Boolean);
}
