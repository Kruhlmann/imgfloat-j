const canvas = document.getElementById('broadcast-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const assets = new Map();
const imageCache = new Map();
const renderStates = new Map();
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
    list.forEach(asset => assets.set(asset.id, asset));
    draw();
}

function handleEvent(event) {
    if (event.type === 'DELETED') {
        assets.delete(event.assetId);
        imageCache.delete(event.assetId);
        renderStates.delete(event.assetId);
    } else if (event.payload && !event.payload.hidden) {
        assets.set(event.payload.id, event.payload);
        ensureImage(event.payload);
    } else if (event.payload && event.payload.hidden) {
        assets.delete(event.payload.id);
        imageCache.delete(event.payload.id);
        renderStates.delete(event.payload.id);
    }
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    assets.forEach(drawAsset);
}

function drawAsset(asset) {
    const renderState = smoothState(asset);
    ctx.save();
    ctx.translate(renderState.x, renderState.y);
    ctx.rotate(renderState.rotation * Math.PI / 180);

    const image = ensureImage(asset);
    if (image?.complete) {
        ctx.drawImage(image, 0, 0, renderState.width, renderState.height);
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

function ensureImage(asset) {
    const cached = imageCache.get(asset.id);
    if (cached && cached.src === asset.url) {
        return cached;
    }

    const image = new Image();
    image.onload = draw;
    image.src = asset.url;
    imageCache.set(asset.id, image);
    return image;
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});

startRenderLoop();
connect();
