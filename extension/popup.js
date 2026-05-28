/* global chrome */

const startButton = document.getElementById("start");
const statusEl = document.getElementById("status");

startButton?.addEventListener("click", () => {
  void startForActiveTab();
});

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
