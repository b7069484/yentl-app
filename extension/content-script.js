/* global chrome */

const EXTENSION_MESSAGE_SOURCE = "yentl-tab-capture-extension";
const APP_BRIDGE_SOURCE = "yentl-web-app";
const PANEL_HOST_ID = "yentl-extension-panel-host";
const PANEL_WIDTH = "430px";
const MAX_PAGE_TEXT_CHARS = 12000;
const MAX_PAGE_TEXT_CHUNKS = 10;
const MIN_PAGE_TEXT_CHARS = 120;

let bridgeReady = false;
let panelAppOrigin = null;
let panelBridgeToken = null;
let panelHost = null;
let panelIframe = null;
let panelStatus = null;
let previousBodyMarginRight = null;
const pendingMessages = [];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return false;

  if (message.target === "yentl-content-script" && message.type === "ping") {
    sendResponse({ ok: true });
    return false;
  }

  if (message.target === "yentl-content-script" && message.type === "open-panel") {
    openPanel(message);
    sendResponse({ ok: true });
    return false;
  }

  if (message.target === "yentl-page") {
    enqueueOrPost(message.message);
    return false;
  }

  return false;
});

window.addEventListener("message", (event) => {
  if (!isAppBridgeEvent(event)) return;

  if (event.data?.type === "bridge-ready") {
    bridgeReady = true;
    flushPendingMessages();
    return;
  }

  if (event.data?.type === "status-request") {
    chrome.runtime.sendMessage({
      target: "background",
      type: "status-request",
    }).then((payload) => {
      enqueueOrPost({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-status",
        payload,
      });
    }).catch(() => {
      enqueueOrPost({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-status",
        payload: {
          running: false,
          message: "Yentl extension is installed, but no tab capture is active.",
        },
      });
    });
    return;
  }

  if (event.data?.type === "capture-stop-request") {
    chrome.runtime.sendMessage({
      target: "background",
      type: "app-stop-capture",
    }).catch(() => {});
  }
});

function openPanel(message) {
  panelAppOrigin = sanitizeOrigin(message.appOrigin);
  panelBridgeToken = typeof message.bridgeToken === "string" ? message.bridgeToken : crypto.randomUUID();
  bridgeReady = false;

  if (!panelAppOrigin) return;

  if (!panelHost) {
    panelHost = document.createElement("div");
    panelHost.id = PANEL_HOST_ID;
    const shadow = panelHost.attachShadow({ mode: "open" });
    shadow.innerHTML = panelMarkup();
    document.documentElement.appendChild(panelHost);
    panelIframe = shadow.querySelector("iframe");
    panelStatus = shadow.querySelector("[data-yentl-status]");
    shadow.querySelector("[data-yentl-close]")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        target: "background",
        type: "app-stop-capture",
      }).catch(() => {});
      updatePanelStatus("Stopping capture...");
    });
    shadow.querySelector("[data-yentl-collapse]")?.addEventListener("click", () => {
      panelHost?.toggleAttribute("data-collapsed");
      const collapsed = panelHost?.hasAttribute("data-collapsed");
      document.body.style.marginRight = collapsed ? previousBodyMarginRight ?? "" : PANEL_WIDTH;
    });
  }

  reservePageSpace();

  const src = new URL("/session", panelAppOrigin);
  src.searchParams.set("source", "browser-tab");
  src.searchParams.set("surface", "extension-panel");
  src.searchParams.set("bridge", panelBridgeToken);
  if (message.tab?.title) src.searchParams.set("title", message.tab.title);

  if (panelIframe) {
    panelIframe.src = src.toString();
  }
  updatePanelStatus("Connecting to Yentl...");
  enqueuePageTextSnapshot(message.tab);
}

function panelMarkup() {
  return `
    <style>
      :host {
        all: initial;
        position: fixed;
        inset: 0 0 0 auto;
        z-index: 2147483647;
        width: min(${PANEL_WIDTH}, 100vw);
        height: 100vh;
        color-scheme: light;
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      :host([data-collapsed]) {
        width: 52px;
      }

      .shell {
        box-sizing: border-box;
        display: grid;
        grid-template-rows: 48px minmax(0, 1fr);
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-left: 1px solid #ded6c5;
        background: #fbfaf7;
        box-shadow: -14px 0 38px rgba(20, 20, 24, 0.18);
      }

      :host([data-collapsed]) .shell {
        grid-template-rows: 100%;
      }

      .bar {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        border-bottom: 1px solid #e8e0d0;
        padding: 8px 10px 8px 14px;
        background: #fffdfa;
      }

      .brand {
        display: inline-flex;
        align-items: baseline;
        gap: 7px;
        min-width: 0;
        color: #17171c;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 24px;
        line-height: 1;
        white-space: nowrap;
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #f59e0b;
      }

      .status {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        color: #62677b;
        font: 500 12px/1.2 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      button {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: 1px solid #ded6c5;
        border-radius: 8px;
        background: #f4efe4;
        color: #25252c;
        cursor: pointer;
        font: 600 16px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      button:hover {
        background: #ece5d8;
      }

      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #fbfaf7;
      }

      :host([data-collapsed]) .brand,
      :host([data-collapsed]) .status,
      :host([data-collapsed]) iframe,
      :host([data-collapsed]) [data-yentl-close] {
        display: none;
      }

      :host([data-collapsed]) .bar {
        height: 100%;
        flex-direction: column;
        justify-content: flex-start;
        padding: 10px;
      }
    </style>
    <div class="shell" role="complementary" aria-label="Yentl analysis panel">
      <div class="bar">
        <div class="brand" aria-label="Yentl">
          <span>yentl</span><span class="dot" aria-hidden="true"></span>
        </div>
        <div class="status" data-yentl-status>Connecting...</div>
        <button type="button" data-yentl-collapse title="Collapse Yentl panel" aria-label="Collapse Yentl panel">‹</button>
        <button type="button" data-yentl-close title="Stop Yentl capture" aria-label="Stop Yentl capture">×</button>
      </div>
      <iframe title="Yentl live analysis"></iframe>
    </div>
  `;
}

function enqueueOrPost(pageMessage) {
  if (!isPageMessage(pageMessage)) return;
  const message = withBridgeToken(pageMessage);
  emitDebugMessage(message);

  if (!bridgeReady) {
    pendingMessages.push(message);
    updatePanelStatus(statusFromMessage(message));
    return;
  }

  postToPage(message);
  updatePanelStatus(statusFromMessage(message));
}

function emitDebugMessage(message) {
  if (!window.__YENTL_CAPTURE_DEBUG__) return;
  window.dispatchEvent(new CustomEvent("yentl-extension-message", { detail: message }));
}

function flushPendingMessages() {
  while (pendingMessages.length > 0) {
    postToPage(pendingMessages.shift());
  }
}

function postToPage(pageMessage) {
  if (panelIframe?.contentWindow && panelAppOrigin) {
    panelIframe.contentWindow.postMessage(pageMessage, panelAppOrigin);
    return;
  }

  window.postMessage(pageMessage, window.location.origin);
}

function isAppBridgeEvent(event) {
  if (event.data?.source !== APP_BRIDGE_SOURCE) return false;

  if (panelIframe?.contentWindow) {
    return (
      event.source === panelIframe.contentWindow &&
      event.origin === panelAppOrigin &&
      event.data?.bridgeToken === panelBridgeToken
    );
  }

  return event.source === window && event.origin === window.location.origin;
}

function isPageMessage(value) {
  return (
    value &&
    typeof value === "object" &&
    value.source === EXTENSION_MESSAGE_SOURCE &&
    typeof value.type === "string"
  );
}

function withBridgeToken(message) {
  if (!panelBridgeToken) return message;
  return { ...message, bridgeToken: panelBridgeToken };
}

function sanitizeOrigin(value) {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function reservePageSpace() {
  if (previousBodyMarginRight === null) {
    previousBodyMarginRight = document.body.style.marginRight;
  }
  document.body.style.marginRight = PANEL_WIDTH;
}

function enqueuePageTextSnapshot(tab) {
  const context = collectPageContextSnapshot(tab);
  if (context) {
    enqueueOrPost({
      source: EXTENSION_MESSAGE_SOURCE,
      type: "page-context",
      payload: context,
    });
  }

  const snapshot = collectPageTextSnapshot(tab);
  if (!snapshot) return;

  enqueueOrPost({
    source: EXTENSION_MESSAGE_SOURCE,
    type: "page-text",
    payload: snapshot,
  });
}

function collectPageContextSnapshot(tab) {
  const sourceContext = collectSourceContext(tab);
  if (!sourceContext) return null;

  return {
    title: tab?.title || document.title || "",
    url: tab?.url || window.location.href,
    source_context: sourceContext,
    captured_at: Date.now(),
  };
}

function collectPageTextSnapshot(tab) {
  const text = extractReadablePageText();
  if (text.length < MIN_PAGE_TEXT_CHARS) return null;

  const chunks = chunkReadableText(text);
  if (chunks.length === 0) return null;

  return {
    title: tab?.title || document.title || "",
    url: tab?.url || window.location.href,
    source_context: collectSourceContext(tab),
    text: text.slice(0, MAX_PAGE_TEXT_CHARS),
    chunks,
    captured_at: Date.now(),
  };
}

function collectSourceContext(tab) {
  const title = tab?.title || document.title || metaContent("og:title") || metaContent("twitter:title") || "";
  const siteName = metaContent("og:site_name");
  const description = metaContent("description") || metaContent("og:description") || metaContent("twitter:description");
  const authorName =
    metaContent("author") ||
    metaContent("article:author") ||
    textFromSelector("[itemprop='author'] [itemprop='name'], [rel='author'], .author, .byline");
  const channelName =
    textFromSelector("#owner #channel-name a, #channel-name #text, ytd-channel-name a, [itemprop='author'] [itemprop='name']") ||
    siteName;
  const username =
    metaContent("twitter:creator") ||
    document.querySelector("meta[itemprop='channelId']")?.getAttribute("content")?.trim() ||
    textFromSelector(".username, [data-testid='User-Name']");
  const canonicalUrl = document.querySelector("link[rel='canonical']")?.getAttribute("href") || tab?.url || window.location.href;
  const detectedNames = Array.from(new Set([
    title,
    channelName,
    authorName,
    metaContent("twitter:creator"),
    metaContent("article:author"),
  ].filter(Boolean).flatMap((value) => detectNames(value)))).slice(0, 8);

  const context = {
    page_title: title || undefined,
    site_name: siteName || undefined,
    channel_name: channelName || undefined,
    author_name: authorName || undefined,
    username: username || undefined,
    description: description || undefined,
    canonical_url: canonicalUrl || undefined,
    detected_names: detectedNames,
  };

  return Object.fromEntries(
    Object.entries(context).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value),
    ),
  );
}

function metaContent(name) {
  if (!name) return "";
  return document
    .querySelector(`meta[name="${cssEscape(name)}"], meta[property="${cssEscape(name)}"]`)
    ?.getAttribute("content")
    ?.trim() || "";
}

function textFromSelector(selector) {
  const node = document.querySelector(selector);
  return normalizeText(node?.textContent || "");
}

function detectNames(text) {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) || [];
  return Array.from(new Set(matches))
    .filter((name) => !/^(YouTube|Wikimedia Commons|Breaking News|Live Stream)$/i.test(name));
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function extractReadablePageText() {
  const root = chooseReadableRoot();
  if (!root) return "";

  let blocks = collectReadableBlocks(root, false);
  if (blocks.join("\n\n").length < MIN_PAGE_TEXT_CHARS) {
    blocks = collectReadableBlocks(root, true);
  }

  const text = dedupeLines(blocks).join("\n\n");
  if (text.length >= MIN_PAGE_TEXT_CHARS) {
    return text.slice(0, MAX_PAGE_TEXT_CHARS);
  }

  return sanitizeReadableText(root.innerText || root.textContent || "").slice(0, MAX_PAGE_TEXT_CHARS);
}

function chooseReadableRoot() {
  const selectors = [
    "article",
    ".mw-parser-output",
    "#mw-content-text",
    "main",
    "[role='main']",
  ];

  for (const selector of selectors) {
    const candidates = Array.from(document.querySelectorAll(selector))
      .map((node) => ({ node, score: readableTextLength(node) }))
      .filter((candidate) => candidate.score >= MIN_PAGE_TEXT_CHARS)
      .sort((a, b) => b.score - a.score);
    if (candidates[0]) return candidates[0].node;
  }

  return document.body || document.documentElement;
}

function collectReadableBlocks(root, includeLists) {
  const selector = includeLists
    ? "h1, h2, h3, p, li, blockquote, figcaption, .description, td.description, .fileinfotpl-type-information td"
    : "h1, h2, h3, p, blockquote, figcaption, .description, td.description, .fileinfotpl-type-information td";

  return Array.from(root.querySelectorAll(selector))
    .filter(isReadableBlock)
    .map((node) => normalizeText(node.innerText || node.textContent || ""))
    .filter((text) => text.length >= 35 && !isBoilerplateText(text));
}

function readableTextLength(node) {
  return normalizeText(node.innerText || node.textContent || "").length;
}

function isReadableBlock(node) {
  if (
    node.closest(
      [
        `#${PANEL_HOST_ID}`,
        "script",
        "style",
        "noscript",
        "template",
        "svg",
        "header",
        "nav",
        "footer",
        "aside",
        "form",
        "button",
        "[aria-hidden='true']",
        "[role='navigation']",
        ".ambox",
        ".catlinks",
        ".infobox",
        ".licensetpl",
        ".mwe-popups",
        ".navbox",
        ".noprint",
        ".metadata",
        ".mw-editsection",
        ".mw-footer",
        ".printfooter",
        ".reference",
        ".sisterproject",
        ".vector-menu",
        ".vertical-navbox",
      ].join(", "),
    )
  ) {
    return false;
  }

  const style = window.getComputedStyle?.(node);
  if (style && (style.display === "none" || style.visibility === "hidden")) {
    return false;
  }

  return true;
}

function dedupeLines(lines) {
  const seen = new Set();
  const result = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result;
}

function sanitizeReadableText(value) {
  return dedupeLines(
    value
      .split(/\n+/)
      .map(normalizeText)
      .filter((text) => text.length >= 35 && !isBoilerplateText(text)),
  ).join("\n\n");
}

function chunkReadableText(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(normalizeText)
    .filter(Boolean);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= 1300) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);
    current = paragraph;

    if (chunks.length >= MAX_PAGE_TEXT_CHUNKS) break;
  }

  if (current && chunks.length < MAX_PAGE_TEXT_CHUNKS) {
    chunks.push(current);
  }

  return chunks.slice(0, MAX_PAGE_TEXT_CHUNKS).map((chunk, index) => ({
    text: chunk,
    start: index,
    end: index + 1,
  }));
}

function normalizeText(value) {
  return value
    .replace(/\[edit\]/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function isBoilerplateText(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes("text of the note") ||
    lower.includes("this file has annotations") ||
    lower.includes("why do you want to remove this note") ||
    lower.includes("gadget-imageannotator") ||
    lower.includes("mediawiki talk:") ||
    lower === "view/save"
  );
}

function updatePanelStatus(text) {
  if (panelStatus && text) panelStatus.textContent = text;
}

function statusFromMessage(message) {
  if (message.type === "page-text") return "Page text captured";
  if (message.type === "capture-start") return "Listening to this page";
  if (message.type === "transcript-final") return "Transcript updating";
  if (message.type === "transcript-interim") return "Audio arriving";
  if (message.type === "capture-stop") return "Capture stopped";
  if (message.type === "capture-error") return message.payload?.message ?? "Capture needs attention";
  if (message.type === "capture-status") return message.payload?.message ?? "Checking capture status";
  return "Connected";
}
