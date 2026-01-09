import { BroadcastRenderer } from "./broadcast/renderer.js";

const canvas = document.getElementById("broadcast-canvas");
const scriptCanvas = document.getElementById("broadcast-script-canvas");
const renderer = new BroadcastRenderer({ canvas, scriptCanvas, broadcaster, showToast });

renderer.start();
