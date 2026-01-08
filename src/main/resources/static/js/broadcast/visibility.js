export function getVisibilityState(state, asset) {
    const current = state.visibilityStates.get(asset.id) || {};
    const targetAlpha = asset.hidden ? 0 : 1;
    const startingAlpha = Number.isFinite(current.alpha) ? current.alpha : 0;
    const factor = asset.hidden ? 0.18 : 0.2;
    const nextAlpha = lerp(startingAlpha, targetAlpha, factor);
    const nextState = { alpha: nextAlpha, targetHidden: !!asset.hidden };
    state.visibilityStates.set(asset.id, nextState);
    return nextState;
}

export function smoothState(state, asset) {
    const previous = state.renderStates.get(asset.id) || { ...asset };
    const factor = 0.15;
    const next = {
        x: lerp(previous.x, asset.x, factor),
        y: lerp(previous.y, asset.y, factor),
        width: lerp(previous.width, asset.width, factor),
        height: lerp(previous.height, asset.height, factor),
        rotation: smoothAngle(previous.rotation, asset.rotation, factor),
    };
    state.renderStates.set(asset.id, next);
    return next;
}

function smoothAngle(current, target, factor) {
    const delta = ((target - current + 180) % 360) - 180;
    return current + delta * factor;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}
