const formElement = document.getElementById("settings-form");
const submitButtonElement = document.getElementById("settings-submit-button");
const canvasFpsElement = document.getElementById("canvas-fps");
const canvasSizeElement = document.getElementById("canvas-size");
const minPlaybackSpeedElement = document.getElementById("min-playback-speed");
const maxPlaybackSpeedElement = document.getElementById("max-playback-speed");
const minPitchElement = document.getElementById("min-audio-pitch");
const maxPitchElement = document.getElementById("max-audio-pitch");
const minVolumeElement = document.getElementById("min-volume");
const maxVolumeElement = document.getElementById("max-volume");

const currentSettings = JSON.parse(serverRenderedSettings);
let userSettings = { ...currentSettings };

function jsonEquals(a, b) {
    if (a === b) return true;

    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
        return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!jsonEquals(a[key], b[key])) return false;
    }

    return true;
}

function setFormSettings(s) {
    canvasFpsElement.value = s.canvasFramesPerSecond;
    canvasSizeElement.value = s.maxCanvasSideLengthPixels;

    minPlaybackSpeedElement.value = s.minAssetPlaybackSpeedFraction;
    maxPlaybackSpeedElement.value = s.maxAssetPlaybackSpeedFraction;
    minPitchElement.value = s.minAssetAudioPitchFraction;
    maxPitchElement.value = s.maxAssetAudioPitchFraction;
    minVolumeElement.value = s.minAssetVolumeFraction;
    maxVolumeElement.value = s.maxAssetVolumeFraction;
}

function readInt(input) {
    return input.checkValidity() ? Number(input.value) : null;
}

function readFloat(input) {
    return input.checkValidity() ? Number(input.value) : null;
}

function loadUserSettingsFromDom() {
    userSettings.canvasFramesPerSecond = readInt(canvasFpsElement);
    userSettings.maxCanvasSideLengthPixels = readInt(canvasSizeElement);
    userSettings.minAssetPlaybackSpeedFraction = readFloat(minPlaybackSpeedElement);
    userSettings.maxAssetPlaybackSpeedFraction = readFloat(maxPlaybackSpeedElement);
    userSettings.minAssetAudioPitchFraction = readFloat(minPitchElement);
    userSettings.maxAssetAudioPitchFraction = readFloat(maxPitchElement);
    userSettings.minAssetVolumeFraction = readFloat(minVolumeElement);
    userSettings.maxAssetVolumeFraction = readFloat(maxVolumeElement);
}

function updateSubmitButtonDisabledState() {
    if (jsonEquals(currentSettings, userSettings)) {
        submitButtonElement.disabled = "disabled";
        return;
    }
    if (!formElement.checkValidity()) {
        submitButtonElement.disabled = "disabled";
        return;
    }
    submitButtonElement.disabled = null;
}

function submitSettingsForm() {
    if (submitButtonElement.getAttribute("disabled") != null) {
        console.warn("Attempted to submit invalid form");
        showToast("Settings not valid", "warning");
        return;
    }
    fetch("/api/settings/set", { method: "PUT", headers: { 'Content-Type': 'application/json' }, body: userSettings }).then((r) => {
        if (!r.ok) {
            throw new Error('Failed to load canvas');
        }
        return r.json();

    })
        .then((newSettings) => {
            currentSettings = { ...newSettings };
            userSettings = { ...newSettings };
        })
        .catch((error) => {
            showToast('Unable to save settings', 'error')
            console.error(error);
        });
}

formElement.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
        loadUserSettingsFromDom();
        updateSubmitButtonDisabledState();
    });
});

setFormSettings(currentSettings);
