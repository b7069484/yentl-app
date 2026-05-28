/* global chrome */

const OFFSCREEN_PATH = "offscreen.html";
const DEFAULT_APP_ORIGIN = "https://yentl.it";
const APP_ORIGIN_KEY = "appOrigin";
const CAPTURE_STATE_KEY = "captureState";
const EXTENSION_MESSAGE_SOURCE = "yentl-tab-capture-extension";

let creatingOffscreen;

chrome.action.onClicked.addListener((tab) => {
  void handleActionClick(tab);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "start-yentl-capture") return;

  void (async () => {
    if (tab?.id) {
      await handleActionClick(tab);
      return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await handleActionClick(activeTab);
  })();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== "background") return false;

  void (async () => {
    if (message.type === "status-request") {
      sendResponse(await buildCaptureStatus());
      return;
    }

    if (message.type === "popup-start-active-tab") {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await handleActionClick(activeTab);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "app-stop-capture") {
      await stopCapture();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "transcript-final" || message.type === "transcript-interim") {
      await forwardToYentl({
        source: EXTENSION_MESSAGE_SOURCE,
        type: message.type,
        payload: message.payload,
      });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "capture-status") {
      await forwardToYentl({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-status",
        payload: message.payload,
      });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "capture-stop") {
      await forwardToYentl({ source: EXTENSION_MESSAGE_SOURCE, type: "capture-stop" });
      await clearCaptureState();
      await setBadge("");
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "capture-error") {
      await forwardToYentl({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-error",
        payload: message.payload,
      });
      await clearCaptureState();
      await setBadge("ERR", "#EF4444");
      sendResponse({ ok: true });
      return;
    }
  })();

  return true;
});

async function handleActionClick(tab) {
  if (!tab?.id) {
    await setBadge("ERR", "#EF4444");
    return;
  }

  const state = await getCaptureState();
  if (state?.running) {
    await stopCapture();
    return;
  }

  await setBadge("...", "#F59E0B");
  await startCapture(tab);
}

async function startCapture(tab) {
  try {
    const appOrigin = await getAppOrigin();
    await ensureAppOriginPermission(appOrigin);
    const bridgeToken = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const tabInfo = {
      tab_id: tab.id,
      title: tab.title ?? "Browser tab",
      url: tab.url ?? "",
    };

    await injectYentlPanel(tab, appOrigin, bridgeToken);
    await setCaptureState({
      running: false,
      appOrigin,
      bridgeToken,
      targetTabId: tab.id,
      sessionId,
      startedAt: Date.now(),
    });
    await setupOffscreenDocument();

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });

    await setCaptureState({
      running: true,
      appOrigin,
      bridgeToken,
      targetTabId: tab.id,
      sessionId,
      startedAt: Date.now(),
    });

    await forwardToYentl({
      source: EXTENSION_MESSAGE_SOURCE,
      type: "capture-start",
      payload: tabInfo,
    });

    await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "start-capture",
      streamId,
      appOrigin,
      sessionId,
      tab: tabInfo,
    });

    await setBadge("REC", "#22C55E");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await forwardToYentl({
      source: EXTENSION_MESSAGE_SOURCE,
      type: "capture-error",
      payload: { message },
    });
    await clearCaptureState();
    await setBadge("ERR", "#EF4444");
  }
}

async function stopCapture() {
  await chrome.runtime.sendMessage({ target: "offscreen", type: "stop-capture" }).catch(() => {});
  await forwardToYentl({ source: EXTENSION_MESSAGE_SOURCE, type: "capture-stop" });
  await clearCaptureState();
  await setBadge("");
}

async function injectYentlPanel(tab, appOrigin, bridgeToken) {
  if (!tab?.id) throw new Error("No active tab is available for Yentl.");

  await ensureContentScript(tab.id);
  await chrome.tabs.sendMessage(tab.id, {
    target: "yentl-content-script",
    type: "open-panel",
    appOrigin,
    bridgeToken,
    tab: {
      tab_id: tab.id,
      title: tab.title ?? "Browser tab",
      url: tab.url ?? "",
    },
  });
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      target: "yentl-content-script",
      type: "ping",
    });
    return;
  } catch {
    // Inject below.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-script.js"],
  });
}

async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) return;

  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["USER_MEDIA"],
      justification: "Capture current tab audio for Yentl live transcription.",
    });
  }

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = undefined;
  }
}

async function forwardToYentl(pageMessage) {
  const state = await getCaptureState();
  const targetTabId = state?.targetTabId;
  if (!targetTabId) return;

  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      await chrome.tabs.sendMessage(targetTabId, {
        target: "yentl-page",
        message: pageMessage,
      });
      return;
    } catch {
      await sleep(350);
    }
  }
}

async function getAppOrigin() {
  const stored = await chrome.storage.sync.get(APP_ORIGIN_KEY);
  const value = stored[APP_ORIGIN_KEY];
  return typeof value === "string" && value.startsWith("http")
    ? value.replace(/\/+$/, "")
    : DEFAULT_APP_ORIGIN;
}

async function ensureAppOriginPermission(appOrigin) {
  const originPattern = originPermissionPattern(appOrigin);
  if (!originPattern || !chrome.permissions) return;

  const hasPermission = await chrome.permissions.contains({ origins: [originPattern] });
  if (hasPermission) return;

  if (!chrome.permissions.request) {
    throw new Error(`Yentl needs Chrome permission to reach ${new URL(appOrigin).origin}.`);
  }

  const granted = await chrome.permissions.request({ origins: [originPattern] });
  if (!granted) {
    throw new Error(`Yentl needs permission to reach ${new URL(appOrigin).origin}.`);
  }
}

function originPermissionPattern(appOrigin) {
  try {
    return `${new URL(appOrigin).origin}/*`;
  } catch {
    return null;
  }
}

async function getCaptureState() {
  const stored = await chrome.storage.session.get(CAPTURE_STATE_KEY);
  return stored[CAPTURE_STATE_KEY] ?? null;
}

async function buildCaptureStatus() {
  const state = await getCaptureState();
  if (!state?.running) {
    return {
      running: false,
      message: "No browser tab capture is active.",
    };
  }

  let tab;
  try {
    tab = state.targetTabId ? await chrome.tabs.get(state.targetTabId) : undefined;
  } catch {
    tab = undefined;
  }

  let activeTab;
  try {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = activeTabs?.[0];
  } catch {
    activeTab = undefined;
  }

  if (activeTab?.id && state.targetTabId && activeTab.id !== state.targetTabId) {
    return {
      running: true,
      phase: "tab_changed",
      title: tab?.title,
      url: tab?.url,
      message: tab?.title
        ? `Yentl is still listening to "${tab.title}". Return to that tab to keep the page and analysis together.`
        : "Yentl is still listening to the original tab. Return to it to keep the page and analysis together.",
    };
  }

  return {
    running: true,
    phase: "capturing",
    title: tab?.title,
    url: tab?.url,
    message: "Browser tab capture is active.",
  };
}

async function setCaptureState(state) {
  await chrome.storage.session.set({ [CAPTURE_STATE_KEY]: state });
}

async function clearCaptureState() {
  await chrome.storage.session.remove(CAPTURE_STATE_KEY);
}

async function setBadge(text, color = "#2563EB") {
  await chrome.action.setBadgeText({ text });
  if (text) {
    await chrome.action.setBadgeBackgroundColor({ color });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
