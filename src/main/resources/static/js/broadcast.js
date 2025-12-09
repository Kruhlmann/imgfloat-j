const canvas = document.getElementById('broadcast-canvas');
const ctx = canvas.getContext('2d');
let canvasSettings = { width: 1920, height: 1080 };
canvas.width = canvasSettings.width;
canvas.height = canvasSettings.height;
const assets = new Map();
const mediaCache = new Map();
const renderStates = new Map();
const animatedCache = new Map();
let animationFrameId = null;

function connect() {
    const socket = new SockJS('/ws');
    const stompClient = Stomp.over(socket);
    stompClient.connect({}, () => {
        stompClient.subscribe(`/topic/channel/${broadcaster}`, (payload) => {
            const body = JSON.parse(payload.body);
            handleEvent(body);
        });
        fetch(`/api/channels/${broadcaster}/assets/visible`).then(r => r.json()).then(renderAssets);
    });
}

function renderAssets(list) {
    list.forEach(asset => {
        asset.zIndex = Math.max(1, asset.zIndex ?? 1);
        assets.set(asset.id, asset);
    });
    draw();
}

function fetchCanvasSettings() {
    return fetch(`/api/channels/${broadcaster}/canvas`)
        .then((r) => r.json())
        .then((settings) => {
            canvasSettings = settings;
            resizeCanvas();
        })
        .catch(() => resizeCanvas());
}

function resizeCanvas() {
    const scale = Math.min(window.innerWidth / canvasSettings.width, window.innerHeight / canvasSettings.height);
    const displayWidth = canvasSettings.width * scale;
    const displayHeight = canvasSettings.height * scale;
    canvas.width = canvasSettings.width;
    canvas.height = canvasSettings.height;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.style.left = `${(window.innerWidth - displayWidth) / 2}px`;
    canvas.style.top = `${(window.innerHeight - displayHeight) / 2}px`;
    draw();
}

function handleEvent(event) {
    if (event.type === 'DELETED') {
        assets.delete(event.assetId);
        clearMedia(event.assetId);
        renderStates.delete(event.assetId);
    } else if (event.payload && !event.payload.hidden) {
        const payload = { ...event.payload, zIndex: Math.max(1, event.payload.zIndex ?? 1) };
        assets.set(payload.id, payload);
        ensureMedia(payload);
    } else if (event.payload && event.payload.hidden) {
        assets.delete(event.payload.id);
        clearMedia(event.payload.id);
        renderStates.delete(event.payload.id);
    }
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    getZOrderedAssets().forEach(drawAsset);
}

function getZOrderedAssets() {
    return Array.from(assets.values()).sort(zComparator);
}

function zComparator(a, b) {
    const aZ = a?.zIndex ?? 1;
    const bZ = b?.zIndex ?? 1;
    if (aZ !== bZ) {
        return aZ - bZ;
    }
    return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
}

function drawAsset(asset) {
    const renderState = smoothState(asset);
    const halfWidth = renderState.width / 2;
    const halfHeight = renderState.height / 2;
    ctx.save();
    ctx.translate(renderState.x + halfWidth, renderState.y + halfHeight);
    ctx.rotate(renderState.rotation * Math.PI / 180);

    const media = ensureMedia(asset);
    const drawSource = media?.isAnimated ? media.bitmap : media;
    const ready = isDrawable(media);
    if (ready) {
        ctx.drawImage(drawSource, -halfWidth, -halfHeight, renderState.width, renderState.height);
    }

    ctx.restore();
}

function smoothState(asset) {
    const previous = renderStates.get(asset.id) || { ...asset };
    const factor = 0.15;
    const next = {
        x: lerp(previous.x, asset.x, factor),
        y: lerp(previous.y, asset.y, factor),
        width: lerp(previous.width, asset.width, factor),
        height: lerp(previous.height, asset.height, factor),
        rotation: smoothAngle(previous.rotation, asset.rotation, factor)
    };
    renderStates.set(asset.id, next);
    return next;
}

function smoothAngle(current, target, factor) {
    const delta = ((target - current + 180) % 360) - 180;
    return current + delta * factor;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function isVideoAsset(asset) {
    return asset?.mediaType?.startsWith('video/');
}

function isVideoElement(element) {
    return element && element.tagName === 'VIDEO';
}

function isGifAsset(asset) {
    return asset?.mediaType?.toLowerCase() === 'image/gif';
}

function isDrawable(element) {
    if (!element) {
        return false;
    }
    if (element.isAnimated) {
        return !!element.bitmap;
    }
    if (isVideoElement(element)) {
        return element.readyState >= 2;
    }
    if (typeof ImageBitmap !== 'undefined' && element instanceof ImageBitmap) {
        return true;
    }
    return !!element.complete;
}

function clearMedia(assetId) {
    mediaCache.delete(assetId);
    const animated = animatedCache.get(assetId);
    if (animated) {
        animated.cancelled = true;
        clearTimeout(animated.timeout);
        animated.bitmap?.close?.();
        animated.decoder?.close?.();
        animatedCache.delete(assetId);
    }
}

function ensureMedia(asset) {
    const cached = mediaCache.get(asset.id);
    if (cached && cached.src === asset.url) {
        applyMediaSettings(cached, asset);
        return cached;
    }

    if (isGifAsset(asset) && 'ImageDecoder' in window) {
        const animated = ensureAnimatedImage(asset);
        if (animated) {
            mediaCache.set(asset.id, animated);
            return animated;
        }
    }

    const element = isVideoAsset(asset) ? document.createElement('video') : new Image();
    if (isVideoElement(element)) {
        element.loop = true;
        element.muted = asset.muted ?? true;
        element.playsInline = true;
        element.autoplay = true;
        element.onloadeddata = draw;
        element.src = asset.url;
        const playback = asset.speed ?? 1;
        element.playbackRate = Math.max(playback, 0.01);
        if (playback === 0) {
            element.pause();
        } else {
            element.play().catch(() => {});
        }
    } else {
        element.onload = draw;
        element.src = asset.url;
    }
    mediaCache.set(asset.id, element);
    return element;
}

function ensureAnimatedImage(asset) {
    const cached = animatedCache.get(asset.id);
    if (cached && cached.url === asset.url) {
        return cached;
    }

    if (cached) {
        clearMedia(asset.id);
    }

    const controller = {
        id: asset.id,
        url: asset.url,
        src: asset.url,
        decoder: null,
        bitmap: null,
        timeout: null,
        cancelled: false,
        isAnimated: true
    };

    fetch(asset.url)
        .then((r) => r.blob())
        .then((blob) => new ImageDecoder({ data: blob, type: blob.type || 'image/gif' }))
        .then((decoder) => {
            if (controller.cancelled) {
                decoder.close?.();
                return null;
            }
            controller.decoder = decoder;
            scheduleNextFrame(controller);
            return controller;
        })
        .catch(() => {
            animatedCache.delete(asset.id);
        });

    animatedCache.set(asset.id, controller);
    return controller;
}

function scheduleNextFrame(controller) {
    if (controller.cancelled || !controller.decoder) {
        return;
    }
    controller.decoder.decode().then(({ image, complete }) => {
        if (controller.cancelled) {
            image.close?.();
            return;
        }
        controller.bitmap?.close?.();
        createImageBitmap(image)
            .then((bitmap) => {
                controller.bitmap = bitmap;
                draw();
            })
            .finally(() => image.close?.());

        const durationMicros = image.duration || 0;
        const delay = durationMicros > 0 ? durationMicros / 1000 : 100;
        const hasMore = !complete;
        controller.timeout = setTimeout(() => {
            if (controller.cancelled) {
                return;
            }
            if (hasMore) {
                scheduleNextFrame(controller);
            } else {
                controller.decoder.reset();
                scheduleNextFrame(controller);
            }
        }, delay);
    }).catch(() => {
        // If decoding fails, clear animated cache so static fallback is used next render
        animatedCache.delete(controller.id);
    });
}

function applyMediaSettings(element, asset) {
    if (!isVideoElement(element)) {
        return;
    }
    const nextSpeed = asset.speed ?? 1;
    const effectiveSpeed = Math.max(nextSpeed, 0.01);
    if (element.playbackRate !== effectiveSpeed) {
        element.playbackRate = effectiveSpeed;
    }
    const shouldMute = asset.muted ?? true;
    if (element.muted !== shouldMute) {
        element.muted = shouldMute;
    }
    if (nextSpeed === 0) {
        element.pause();
    } else if (element.paused) {
        element.play().catch(() => {});
    }
}

function startRenderLoop() {
    if (animationFrameId) {
        return;
    }
    const tick = () => {
        draw();
        animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);
}

window.addEventListener('resize', () => {
    resizeCanvas();
});

fetchCanvasSettings().finally(() => {
    resizeCanvas();
    startRenderLoop();
    connect();
});
