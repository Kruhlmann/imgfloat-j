const { app, BrowserWindow } = require("electron");
const path = require("path");
let broadcastRect = { width: 0, height: 0 };

async function autoResizeWindow(window, lastSize) {
    if (window.isDestroyed()) {
        return lastSize;
    }
    const newSize = await window.webContents.executeJavaScript(`(() => {
        const canvas = document.getElementById('broadcast-canvas');
        if (!canvas) {
            return null;
        }
        const rect = canvas.getBoundingClientRect();
        return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        };
    })();`);

    if (!newSize?.width || !newSize?.height) {
        return lastSize;
    }
    if (lastSize.width === newSize.width && lastSize.height === newSize.height) {
        return lastSize;
    }
    console.log(
        `Window size did not match canvas old: ${lastSize.width}x${lastSize.height} new: ${newSize.width}x${newSize.height}. Resizing.`,
    );
    window.setContentSize(newSize.width, newSize.height, false);
    window.setResizable(false);
    return newSize;
}

function createWindow() {
    const url = process.env["IMGFLOAT_CHANNELS_URL"] || "https://imgfloat.kruhlmann.dev/channels";
    const initialWindowWidthPx = 960;
    const initialWindowHeightPx = 640;
    const applicationWindow = new BrowserWindow({
        width: initialWindowWidthPx,
        height: initialWindowHeightPx,
        transparent: true,
        frame: true,
        backgroundColor: "#00000000",
        alwaysOnTop: false,
        icon: path.join(__dirname, "../resources/assets/icon/appicon.ico"),
        webPreferences: { backgroundThrottling: false },
    });
    applicationWindow.setMenu(null);

    let canvasSizeInterval;
    const clearCanvasSizeInterval = () => {
        if (canvasSizeInterval) {
            clearInterval(canvasSizeInterval);
            canvasSizeInterval = undefined;
        }
    };

    const handleNavigation = (navigationUrl) => {
        try {
            const { pathname } = new URL(navigationUrl);
            const isBroadcast = /\/view\/[^/]+\/broadcast\/?$/.test(pathname);

            if (isBroadcast) {
                clearCanvasSizeInterval();
                canvasSizeInterval = setInterval(() => {
                    autoResizeWindow(applicationWindow, broadcastRect).then((newSize) => {
                        broadcastRect = newSize;
                    });
                }, 750);
                autoResizeWindow(applicationWindow, broadcastRect).then((newSize) => {
                    broadcastRect = newSize;
                });
            } else {
                clearCanvasSizeInterval();
                applicationWindow.setSize(initialWindowWidthPx, initialWindowHeightPx, false);
            }
        } catch {
            // Ignore malformed URLs while navigating.
        }
    };

    applicationWindow.loadURL(url);

    applicationWindow.webContents.on("did-finish-load", () => {
        handleNavigation(applicationWindow.webContents.getURL());
    });

    applicationWindow.webContents.on("did-navigate", (_event, navigationUrl) => handleNavigation(navigationUrl));
    applicationWindow.webContents.on("did-navigate-in-page", (_event, navigationUrl) =>
        handleNavigation(navigationUrl),
    );
    applicationWindow.on("closed", clearCanvasSizeInterval);
}

app.whenReady().then(createWindow);
