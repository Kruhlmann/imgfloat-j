const { app, BrowserWindow } = require('electron');

function createWindow() {
    const url = process.env.ELECTRON_START_URL || "https://imgfloat.kruhlmann.dev/channels";
    const width = Number.parseInt(process.env.ELECTRON_WINDOW_WIDTH, 10) || 1920;
    const height = Number.parseInt(process.env.ELECTRON_WINDOW_HEIGHT, 10) || 1080;

    const win = new BrowserWindow({
        width: width,
        height: height,
        transparent: true,
        frame: false,
        alwaysOnTop: false,
        webPreferences: {
            backgroundThrottling: false
        }
    });

    win.loadURL(url);
}

app.whenReady().then(() => {
    createWindow();
});
