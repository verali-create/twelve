// background.js - service worker for twelve

chrome.runtime.onInstalled.addListener(() => {
  console.log("twelve extension installed");
});

// Listen for keyboard shortcut to start selection
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "twelve-start-selection") return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    await chrome.tabs.sendMessage(tab.id, { type: "TWELVE_ENTER_SELECTION_MODE" });
  } catch (err) {
    console.error("twelve: failed to start selection", err);
  }
});

