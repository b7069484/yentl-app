/* global chrome */

const APP_ORIGIN_KEY = "appOrigin";
const DEFAULT_APP_ORIGIN = "http://localhost:3000";

const input = document.getElementById("app-origin");
const button = document.getElementById("save");
const status = document.getElementById("status");

chrome.storage.sync.get(APP_ORIGIN_KEY).then((stored) => {
  input.value = stored[APP_ORIGIN_KEY] ?? DEFAULT_APP_ORIGIN;
});

button.addEventListener("click", async () => {
  try {
    const origin = normalizeOrigin(input.value);
    await chrome.storage.sync.set({ [APP_ORIGIN_KEY]: origin });
    status.textContent = "Saved.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  }
});

function normalizeOrigin(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Use an http or https origin.");
  }
  return parsed.origin;
}
