/* global chrome */

const APP_ORIGIN_KEY = "appOrigin";
const DEFAULT_APP_ORIGIN = "https://yentl.it";

const startButton = document.getElementById("start");
const statusEl = document.getElementById("status");
const tabTitleEl = document.getElementById("tab-title");
const appOriginEl = document.getElementById("app-origin");
const settingsButton = document.getElementById("settings");

let activeTab = null;
let captureStatus = { running: false };

startButton?.addEventListener("click", () => {
  void handlePrimaryAction();
});

settingsButton?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage?.();
  window.setTimeout(() => window.close(), 150);
});

void initializePopup();

async function initializePopup() {
  await Promise.all([
    loadActiveTab(),
    loadAppOrigin(),
    loadCaptureStatus(),
  ]);
  renderPopup();
}

async function loadActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab ?? null;
  } catch {
    activeTab = null;
  }
}

async function loadAppOrigin() {
  try {
    const stored = await chrome.storage.sync.get(APP_ORIGIN_KEY);
    const origin = stored[APP_ORIGIN_KEY] ?? DEFAULT_APP_ORIGIN;
    if (appOriginEl) appOriginEl.textContent = origin;
  } catch {
    if (appOriginEl) appOriginEl.textContent = DEFAULT_APP_ORIGIN;
  }
}

async function loadCaptureStatus() {
  try {
    captureStatus = await chrome.runtime.sendMessage({
      target: "background",
      type: "status-request",
    }) ?? { running: false };
  } catch {
    captureStatus = { running: false };
  }
}

function renderPopup() {
  if (tabTitleEl) {
    tabTitleEl.textContent = activeTab?.title || activeTab?.url || "No active tab detected";
    tabTitleEl.title = activeTab?.url || activeTab?.title || "";
  }

  if (!startButton || !statusEl) return;

  if (captureStatus.running) {
    startButton.disabled = false;
    startButton.textContent = "Stop live analysis";
    statusEl.textContent =
      captureStatus.message ||
      (captureStatus.title
        ? `Yentl is listening to ${captureStatus.title}.`
        : "Yentl is listening to a browser tab.");
    return;
  }

  const unsupported = !isCapturableTab(activeTab);
  if (unsupported) {
    startButton.disabled = true;
    startButton.textContent = "Capture unavailable";
    statusEl.textContent =
      "Chrome does not allow tab capture on this page. Open a normal http or https media/article page and try again.";
    return;
  }

  startButton.disabled = false;
  startButton.textContent = "Start live analysis";
  statusEl.textContent = activeTab?.title
    ? `Ready to open Yentl beside ${activeTab.title}.`
    : "Ready to open Yentl beside this page.";
}

async function handlePrimaryAction() {
  if (captureStatus.running) {
    await stopCurrentCapture();
    return;
  }
  await startForActiveTab();
}

async function startForActiveTab() {
  if (!startButton || !statusEl) return;
  startButton.disabled = true;
  statusEl.textContent = "Opening Yentl beside this tab...";

  try {
    const response = await chrome.runtime.sendMessage({
      target: "background",
      type: "popup-start-active-tab",
    });
    if (!response?.ok) throw new Error("Yentl did not confirm capture start.");
    statusEl.textContent = "Yentl is listening.";
    window.setTimeout(() => window.close(), 450);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    statusEl.textContent = `Yentl could not start: ${message}`;
    startButton.disabled = false;
  }
}

async function stopCurrentCapture() {
  if (!startButton || !statusEl) return;
  startButton.disabled = true;
  statusEl.textContent = "Stopping Yentl capture...";

  try {
    const response = await chrome.runtime.sendMessage({
      target: "background",
      type: "app-stop-capture",
    });
    if (!response?.ok) throw new Error("Yentl did not confirm capture stop.");
    captureStatus = { running: false };
    statusEl.textContent = "Yentl capture stopped.";
    renderPopup();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    statusEl.textContent = `Yentl could not stop: ${message}`;
  } finally {
    startButton.disabled = false;
  }
}

function isCapturableTab(tab) {
  if (!tab?.id) return false;
  if (!tab.url) return false;
  try {
    const url = new URL(tab.url);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
