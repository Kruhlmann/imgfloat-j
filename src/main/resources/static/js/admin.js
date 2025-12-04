let stompClient;
const canvas = document.getElementById('admin-canvas');
const ctx = canvas.getContext('2d');
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
const assets = new Map();
const imageCache = new Map();
const renderStates = new Map();
let selectedAssetId = null;
let dragState = null;
let animationFrameId = null;

const controlsPanel = document.getElementById('asset-controls');
const widthInput = document.getElementById('asset-width');
const heightInput = document.getElementById('asset-height');
const rotationInput = document.getElementById('asset-rotation');
const rotationDisplay = document.getElementById('rotation-display');
const selectedAssetName = document.getElementById('selected-asset-name');
const selectedAssetMeta = document.getElementById('selected-asset-meta');

if (rotationInput) {
    rotationInput.addEventListener('input', updateRotationDisplay);
}

function connect() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, () => {
        stompClient.subscribe(`/topic/channel/${broadcaster}`, (payload) => {
            const body = JSON.parse(payload.body);
            handleEvent(body);
        });
        fetchAssets();
    });
}

function fetchAssets() {
    fetch(`/api/channels/${broadcaster}/assets`).then((r) => r.json()).then(renderAssets);
}

function renderAssets(list) {
    list.forEach((asset) => assets.set(asset.id, asset));
    drawAndList();
}

function handleEvent(event) {
    if (event.type === 'DELETED') {
        assets.delete(event.assetId);
        imageCache.delete(event.assetId);
        renderStates.delete(event.assetId);
        if (selectedAssetId === event.assetId) {
            selectedAssetId = null;
        }
    } else if (event.payload) {
        assets.set(event.payload.id, event.payload);
        ensureImage(event.payload);
    }
    drawAndList();
}

function drawAndList() {
    draw();
    renderAssetList();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    assets.forEach((asset) => drawAsset(asset));
}

function drawAsset(asset) {
    const renderState = smoothState(asset);
    ctx.save();
    ctx.translate(renderState.x, renderState.y);
    ctx.rotate(renderState.rotation * Math.PI / 180);

    const image = ensureImage(asset);
    if (image?.complete) {
        ctx.globalAlpha = asset.hidden ? 0.35 : 0.9;
        ctx.drawImage(image, 0, 0, renderState.width, renderState.height);
    } else {
        ctx.globalAlpha = asset.hidden ? 0.2 : 0.4;
        ctx.fillStyle = 'rgba(124, 58, 237, 0.35)';
        ctx.fillRect(0, 0, renderState.width, renderState.height);
    }

    if (asset.hidden) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.fillRect(0, 0, renderState.width, renderState.height);
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = asset.id === selectedAssetId ? 'rgba(124, 58, 237, 0.9)' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = asset.id === selectedAssetId ? 2 : 1;
    ctx.setLineDash(asset.id === selectedAssetId ? [6, 4] : []);
    ctx.strokeRect(0, 0, renderState.width, renderState.height);
    ctx.restore();
}

function smoothState(asset) {
    const previous = renderStates.get(asset.id) || { ...asset };
    const factor = dragState && dragState.assetId === asset.id ? 0.5 : 0.18;
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
    let delta = ((target - current + 180) % 360) - 180;
    return current + delta * factor;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
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

function renderAssetList() {
    const list = document.getElementById('asset-list');
    list.innerHTML = '';

    if (!assets.size) {
        const empty = document.createElement('li');
        empty.textContent = 'No assets yet. Upload to get started.';
        list.appendChild(empty);
        updateSelectedAssetControls();
        return;
    }

    const sortedAssets = Array.from(assets.values()).sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    sortedAssets.forEach((asset) => {
        const li = document.createElement('li');
        li.className = 'asset-item';
        if (asset.id === selectedAssetId) {
            li.classList.add('selected');
        }
        if (asset.hidden) {
            li.classList.add('hidden');
        }

        const preview = document.createElement('img');
        preview.className = 'asset-preview';
        preview.src = asset.url;
        preview.alt = asset.name || 'Asset preview';

        const meta = document.createElement('div');
        meta.className = 'meta';
        const name = document.createElement('strong');
        name.textContent = asset.name || `Asset ${asset.id.slice(0, 6)}`;
        const details = document.createElement('small');
        details.textContent = `${Math.round(asset.width)}x${Math.round(asset.height)} · ${asset.hidden ? 'Hidden' : 'Visible'}`;
        meta.appendChild(name);
        meta.appendChild(details);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'secondary';
        toggleBtn.textContent = asset.hidden ? 'Show' : 'Hide';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedAssetId = asset.id;
            updateVisibility(asset, !asset.hidden);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'secondary';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAsset(asset);
        });

        actions.appendChild(toggleBtn);
        actions.appendChild(deleteBtn);

        li.addEventListener('click', () => {
            selectedAssetId = asset.id;
            renderStates.set(asset.id, { ...asset });
            drawAndList();
        });

        li.appendChild(preview);
        li.appendChild(meta);
        li.appendChild(actions);
        list.appendChild(li);
    });

    updateSelectedAssetControls();
}

function getSelectedAsset() {
    return selectedAssetId ? assets.get(selectedAssetId) : null;
}

function updateSelectedAssetControls() {
    if (!controlsPanel) {
        return;
    }
    const asset = getSelectedAsset();
    if (!asset) {
        controlsPanel.classList.add('hidden');
        return;
    }

    controlsPanel.classList.remove('hidden');
    selectedAssetName.textContent = asset.name || `Asset ${asset.id.slice(0, 6)}`;
    selectedAssetMeta.textContent = `${Math.round(asset.width)}x${Math.round(asset.height)} · ${asset.hidden ? 'Hidden' : 'Visible'}`;

    if (widthInput) widthInput.value = Math.round(asset.width);
    if (heightInput) heightInput.value = Math.round(asset.height);
    if (rotationInput) {
        rotationInput.value = Math.round(asset.rotation);
        updateRotationDisplay();
    }
}

function applyTransformFromInputs() {
    const asset = getSelectedAsset();
    if (!asset) return;
    const nextWidth = parseFloat(widthInput?.value) || asset.width;
    const nextHeight = parseFloat(heightInput?.value) || asset.height;
    const nextRotation = parseFloat(rotationInput?.value) || 0;

    asset.width = Math.max(10, nextWidth);
    asset.height = Math.max(10, nextHeight);
    asset.rotation = nextRotation;
    renderStates.set(asset.id, { ...asset });
    persistTransform(asset);
    drawAndList();
}

function nudgeRotation(delta) {
    const asset = getSelectedAsset();
    if (!asset) return;
    const next = (asset.rotation || 0) + delta;
    if (rotationInput) rotationInput.value = next;
    asset.rotation = next;
    renderStates.set(asset.id, { ...asset });
    updateRotationDisplay();
    persistTransform(asset);
}

function updateRotationDisplay() {
    if (rotationDisplay && rotationInput) {
        const value = Math.round(parseFloat(rotationInput.value || '0'));
        rotationDisplay.textContent = `${value}°`;
    }
}

function updateVisibility(asset, hidden) {
    fetch(`/api/channels/${broadcaster}/assets/${asset.id}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden })
    }).then((r) => r.json()).then((updated) => {
        assets.set(updated.id, updated);
        drawAndList();
    });
}

function deleteAsset(asset) {
    fetch(`/api/channels/${broadcaster}/assets/${asset.id}`, { method: 'DELETE' }).then(() => {
        assets.delete(asset.id);
        imageCache.delete(asset.id);
        renderStates.delete(asset.id);
        if (selectedAssetId === asset.id) {
            selectedAssetId = null;
        }
        drawAndList();
    });
}

function uploadAsset() {
    const fileInput = document.getElementById('asset-file');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Please choose an image to upload.');
        return;
    }
    const data = new FormData();
    data.append('file', fileInput.files[0]);
    fetch(`/api/channels/${broadcaster}/assets`, {
        method: 'POST',
        body: data
    }).then(() => {
        fileInput.value = '';
    });
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

function isPointOnAsset(asset, x, y) {
    ctx.save();
    ctx.translate(asset.x, asset.y);
    ctx.rotate(asset.rotation * Math.PI / 180);
    const path = new Path2D();
    path.rect(0, 0, asset.width, asset.height);
    const hit = ctx.isPointInPath(path, x, y);
    ctx.restore();
    return hit;
}

function findAssetAtPoint(x, y) {
    const ordered = Array.from(assets.values()).reverse();
    return ordered.find((asset) => isPointOnAsset(asset, x, y)) || null;
}

function persistTransform(asset) {
    fetch(`/api/channels/${broadcaster}/assets/${asset.id}/transform`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            x: asset.x,
            y: asset.y,
            width: asset.width,
            height: asset.height,
            rotation: asset.rotation
        })
    }).then((r) => r.json()).then((updated) => {
        assets.set(updated.id, updated);
        drawAndList();
    });
}

canvas.addEventListener('mousedown', (event) => {
    const point = getCanvasPoint(event);
    const hit = findAssetAtPoint(point.x, point.y);
    if (hit) {
        selectedAssetId = hit.id;
        dragState = {
            assetId: hit.id,
            offsetX: point.x - hit.x,
            offsetY: point.y - hit.y
        };
    } else {
        selectedAssetId = null;
    }
    drawAndList();
});

canvas.addEventListener('mousemove', (event) => {
    if (!dragState) {
        return;
    }
    const asset = assets.get(dragState.assetId);
    if (!asset) {
        dragState = null;
        return;
    }
    const point = getCanvasPoint(event);
    asset.x = point.x - dragState.offsetX;
    asset.y = point.y - dragState.offsetY;
    draw();
});

function endDrag() {
    if (!dragState) {
        return;
    }
    const asset = assets.get(dragState.assetId);
    dragState = null;
    drawAndList();
    if (asset) {
        persistTransform(asset);
    }
}

canvas.addEventListener('mouseup', endDrag);
canvas.addEventListener('mouseleave', endDrag);

window.addEventListener('resize', () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();
});

startRenderLoop();
connect();
