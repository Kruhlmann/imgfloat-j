const audioUnlockEvents = ["pointerdown", "keydown", "touchstart"];

export function createAudioManager({ assets, globalScope = globalThis }) {
    const audioControllers = new Map();
    const pendingAudioUnlock = new Set();

    audioUnlockEvents.forEach((eventName) => {
        globalScope.addEventListener(eventName, () => {
            if (!pendingAudioUnlock.size) return;
            pendingAudioUnlock.forEach((controller) => safePlay(controller, pendingAudioUnlock));
            pendingAudioUnlock.clear();
        });
    });

    function ensureAudioController(asset) {
        const cached = audioControllers.get(asset.id);
        if (cached && cached.src === asset.url) {
            applyAudioSettings(cached, asset);
            return cached;
        }

        if (cached) {
            clearAudio(asset.id);
        }

        const element = new Audio(asset.url);
        element.autoplay = true;
        element.preload = "auto";
        element.controls = false;
        element.addEventListener("loadedmetadata", () => recordDuration(asset.id, element.duration));
        const controller = {
            id: asset.id,
            src: asset.url,
            element,
            delayTimeout: null,
            loopEnabled: false,
            loopActive: true,
            delayMs: 0,
            baseDelayMs: 0,
        };
        element.onended = () => handleAudioEnded(asset.id);
        audioControllers.set(asset.id, controller);
        applyAudioSettings(controller, asset, true);
        return controller;
    }

    function applyAudioSettings(controller, asset, resetPosition = false) {
        controller.loopEnabled = !!asset.audioLoop;
        controller.loopActive = controller.loopEnabled && controller.loopActive !== false;
        controller.baseDelayMs = Math.max(0, asset.audioDelayMillis || 0);
        controller.delayMs = controller.baseDelayMs;
        applyAudioElementSettings(controller.element, asset);
        if (resetPosition) {
            controller.element.currentTime = 0;
            controller.element.pause();
        }
    }

    function applyAudioElementSettings(element, asset) {
        const speed = Math.max(0.25, asset.audioSpeed || 1);
        const pitch = Math.max(0.5, asset.audioPitch || 1);
        element.playbackRate = speed * pitch;
        const volume = Math.max(0, Math.min(2, asset.audioVolume ?? 1));
        element.volume = Math.min(volume, 1);
    }

    function getAssetVolume(asset) {
        return Math.max(0, Math.min(2, asset?.audioVolume ?? 1));
    }

    function applyMediaVolume(element, asset) {
        if (!element) return 1;
        const volume = getAssetVolume(asset);
        element.volume = Math.min(volume, 1);
        return volume;
    }

    function handleAudioEnded(assetId) {
        const controller = audioControllers.get(assetId);
        if (!controller) return;
        controller.element.currentTime = 0;
        if (controller.delayTimeout) {
            clearTimeout(controller.delayTimeout);
        }
        if (controller.loopEnabled && controller.loopActive) {
            controller.delayTimeout = setTimeout(() => {
                safePlay(controller, pendingAudioUnlock);
            }, controller.delayMs);
        } else {
            controller.element.pause();
        }
    }

    function stopAudio(assetId) {
        const controller = audioControllers.get(assetId);
        if (!controller) return;
        if (controller.delayTimeout) {
            clearTimeout(controller.delayTimeout);
        }
        controller.element.pause();
        controller.element.currentTime = 0;
        controller.delayTimeout = null;
        controller.delayMs = controller.baseDelayMs;
        controller.loopActive = false;
    }

    function playAudioImmediately(asset) {
        const controller = ensureAudioController(asset);
        if (controller.delayTimeout) {
            clearTimeout(controller.delayTimeout);
            controller.delayTimeout = null;
        }
        controller.element.currentTime = 0;
        const originalDelay = controller.delayMs;
        controller.delayMs = 0;
        safePlay(controller, pendingAudioUnlock);
        controller.delayMs = controller.baseDelayMs ?? originalDelay ?? 0;
    }

    function playOverlappingAudio(asset) {
        const temp = new Audio(asset.url);
        temp.autoplay = true;
        temp.preload = "auto";
        temp.controls = false;
        applyAudioElementSettings(temp, asset);
        const controller = { element: temp };
        temp.onended = () => {
            temp.remove();
        };
        safePlay(controller, pendingAudioUnlock);
    }

    function handleAudioPlay(asset, shouldPlay) {
        const controller = ensureAudioController(asset);
        controller.loopActive = !!shouldPlay;
        if (!shouldPlay) {
            stopAudio(asset.id);
            return;
        }
        if (asset.audioLoop) {
            controller.delayMs = controller.baseDelayMs;
            safePlay(controller, pendingAudioUnlock);
        } else {
            playOverlappingAudio(asset);
        }
    }

    function autoStartAudio(asset) {
        if (asset.hidden) {
            return;
        }
        const controller = ensureAudioController(asset);
        if (!controller.loopEnabled || !controller.loopActive) {
            return;
        }
        if (!controller.element.paused && !controller.element.ended) {
            return;
        }
        if (controller.delayTimeout) {
            return;
        }
        controller.delayTimeout = setTimeout(() => {
            safePlay(controller, pendingAudioUnlock);
        }, controller.delayMs);
    }

    function recordDuration(assetId, seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return;
        }
        const asset = assets.get(assetId);
        if (!asset) {
            return;
        }
        const nextMs = Math.round(seconds * 1000);
        if (asset.durationMs === nextMs) {
            return;
        }
        asset.durationMs = nextMs;
    }

    function clearAudio(assetId) {
        const audio = audioControllers.get(assetId);
        if (!audio) {
            return;
        }
        if (audio.delayTimeout) {
            clearTimeout(audio.delayTimeout);
        }
        audio.element.pause();
        audio.element.currentTime = 0;
        audio.element.src = "";
        audio.element.remove();
        audioControllers.delete(assetId);
    }

    return {
        ensureAudioController,
        applyMediaVolume,
        handleAudioPlay,
        stopAudio,
        playAudioImmediately,
        autoStartAudio,
        clearAudio,
    };
}

function safePlay(controller, pendingUnlock) {
    if (!controller?.element) return;
    const playPromise = controller.element.play();
    if (playPromise?.catch) {
        playPromise.catch(() => {
            pendingUnlock.add(controller);
        });
    }
}
