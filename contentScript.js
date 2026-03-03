// contentScript.js - selection overlay, text extraction, and bubble UI for twelve

const TWELVE_OVERLAY_ID = "__twelve_selection_overlay__";
const TWELVE_BUBBLE_ID = "__twelve_result_bubble__";

let twelveOverlay = null;
let twelveSelectionBox = null;
let isSelecting = false;
let startX = 0;
let startY = 0;

// Listen for messages from background to enter selection mode
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TWELVE_ENTER_SELECTION_MODE") {
    enterSelectionMode();
  }
});

function enterSelectionMode() {
  if (document.getElementById(TWELVE_OVERLAY_ID)) {
    return;
  }

  twelveOverlay = document.createElement("div");
  twelveOverlay.id = TWELVE_OVERLAY_ID;
  Object.assign(twelveOverlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    background: "rgba(0, 0, 0, 0.02)",
    backdropFilter: "none",
  });

  twelveSelectionBox = document.createElement("div");
  Object.assign(twelveSelectionBox.style, {
    position: "fixed",
    border: "1px solid #4f46e5",
    background: "rgba(79, 70, 229, 0.1)",
    pointerEvents: "none",
    display: "none",
  });

  twelveOverlay.appendChild(twelveSelectionBox);
  document.documentElement.appendChild(twelveOverlay);

  twelveOverlay.addEventListener("mousedown", onMouseDown);
  twelveOverlay.addEventListener("mousemove", onMouseMove);
  twelveOverlay.addEventListener("mouseup", onMouseUp);
  twelveOverlay.addEventListener("keydown", onKeyDown, { capture: true });
  twelveOverlay.tabIndex = -1;
  twelveOverlay.focus();
}

function cleanupOverlay() {
  if (!twelveOverlay) return;
  twelveOverlay.removeEventListener("mousedown", onMouseDown);
  twelveOverlay.removeEventListener("mousemove", onMouseMove);
  twelveOverlay.removeEventListener("mouseup", onMouseUp);
  twelveOverlay.removeEventListener("keydown", onKeyDown, { capture: true });
  twelveOverlay.remove();
  twelveOverlay = null;
  twelveSelectionBox = null;
  isSelecting = false;
}

function onMouseDown(event) {
  event.preventDefault();
  isSelecting = true;
  startX = event.clientX;
  startY = event.clientY;

  if (!twelveSelectionBox) return;
  twelveSelectionBox.style.display = "block";
  twelveSelectionBox.style.left = `${startX}px`;
  twelveSelectionBox.style.top = `${startY}px`;
  twelveSelectionBox.style.width = "0px";
  twelveSelectionBox.style.height = "0px";
}

function onMouseMove(event) {
  if (!isSelecting || !twelveSelectionBox) return;
  const currentX = event.clientX;
  const currentY = event.clientY;

  const rect = normalizeRect(startX, startY, currentX, currentY);
  twelveSelectionBox.style.left = `${rect.x}px`;
  twelveSelectionBox.style.top = `${rect.y}px`;
  twelveSelectionBox.style.width = `${rect.width}px`;
  twelveSelectionBox.style.height = `${rect.height}px`;
}

function onMouseUp(event) {
  if (!isSelecting) return;
  isSelecting = false;

  const endX = event.clientX;
  const endY = event.clientY;
  const selectionRect = normalizeRect(startX, startY, endX, endY);

  cleanupOverlay();

  const capturedText = extractTextInRect(selectionRect);
  if (capturedText.trim().length === 0) {
    showBubble("No text found in selection.", "");
    return;
  }

  const simplified = mockSimplify(capturedText);
  showBubble(simplified, capturedText);
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    event.stopPropagation();
    event.preventDefault();
    cleanupOverlay();
  }
}

function normalizeRect(x1, y1, x2, y2) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function rectsIntersect(r1, r2) {
  return !(
    r2.left > r1.x + r1.width ||
    r2.right < r1.x ||
    r2.top > r1.y + r1.height ||
    r2.bottom < r1.y
  );
}

function extractTextInRect(selectionRect) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const pieces = [];
  let node;
  while ((node = walker.nextNode())) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (
      rect.width === 0 ||
      rect.height === 0 ||
      (rect.top === 0 && rect.bottom === 0 && rect.left === 0 && rect.right === 0)
    ) {
      continue;
    }

    if (rectsIntersect(selectionRect, rect)) {
      pieces.push(node.nodeValue.trim());
    }
  }

  const text = pieces.join(" ").replace(/\s+/g, " ").trim();
  return text;
}

function mockSimplify(text) {
  // Very naive "simplification" just for MVP UX:
  // - Split long sentences
  // - Replace a few common complex words with simpler alternatives
  let simplified = text;

  const replacements = [
    ["utilize", "use"],
    ["leverage", "use"],
    ["approximately", "about"],
    ["subsequently", "then"],
    ["prior to", "before"],
    ["substantial", "big"],
    ["facilitate", "help"],
    ["demonstrate", "show"],
  ];

  for (const [from, to] of replacements) {
    const re = new RegExp("\\b" + from + "\\b", "gi");
    simplified = simplified.replace(re, to);
  }

  // Split on long comma chains into shorter sentences (very rough)
  simplified = simplified.replace(/,([^,]{40,})/g, ". $1");

  return simplified;
}

function showBubble(simplifiedText, originalText) {
  // Remove any existing bubble
  const existing = document.getElementById(TWELVE_BUBBLE_ID);
  if (existing) {
    existing.remove();
  }

  const bubble = document.createElement("div");
  bubble.id = TWELVE_BUBBLE_ID;
  Object.assign(bubble.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    maxWidth: "380px",
    maxHeight: "50vh",
    overflow: "auto",
    background: "#0f172a",
    color: "#e5e7eb",
    borderRadius: "12px",
    boxShadow:
      "0 10px 25px rgba(15, 23, 42, 0.6), 0 0 0 1px rgba(148, 163, 184, 0.35)",
    padding: "12px 14px 10px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, system-ui, -system-ui, "SF Pro Text", "Helvetica Neue", sans-serif',
    fontSize: "13px",
    lineHeight: "1.5",
    zIndex: "2147483647",
    backdropFilter: "blur(18px)",
  });

  const header = document.createElement("div");
  header.textContent = "twelve · simplified";
  Object.assign(header.style, {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#9ca3af",
    marginBottom: "6px",
  });

  const body = document.createElement("div");
  body.textContent = simplifiedText || "";
  Object.assign(body.style, {
    marginBottom: "8px",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  });

  const footer = document.createElement("div");
  Object.assign(footer.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "6px",
    marginTop: "4px",
  });

  const leftButtons = document.createElement("div");
  Object.assign(leftButtons.style, {
    display: "flex",
    gap: "4px",
  });

  function createButton(label) {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      border: "none",
      borderRadius: "999px",
      padding: "4px 9px",
      fontSize: "11px",
      fontWeight: "500",
      cursor: "pointer",
      background: "#111827",
      color: "#e5e7eb",
      boxShadow: "0 0 0 1px rgba(55, 65, 81, 0.8)",
    });
    btn.onmouseenter = () => {
      btn.style.background = "#1f2937";
    };
    btn.onmouseleave = () => {
      btn.style.background = "#111827";
    };
    return btn;
  }

  const copyBtn = createButton("Copy");
  copyBtn.addEventListener("click", async () => {
    const target = simplifiedText || originalText;
    try {
      await navigator.clipboard.writeText(target);
      copyBtn.textContent = "Copied";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1200);
    } catch (err) {
      console.error("twelve: copy failed", err);
    }
  });

  const retryBtn = createButton("Try again");
  retryBtn.addEventListener("click", () => {
    const retried = mockSimplify(originalText || simplifiedText || "");
    body.textContent = retried;
  });

  const chatBtn = createButton("Open Chat");
  Object.assign(chatBtn.style, {
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed, #ec4899)",
    boxShadow:
      "0 0 0 1px rgba(129, 140, 248, 0.9), 0 10px 20px rgba(79, 70, 229, 0.5)",
  });
  chatBtn.onmouseenter = () => {
    chatBtn.style.filter = "brightness(1.05)";
  };
  chatBtn.onmouseleave = () => {
    chatBtn.style.filter = "brightness(1)";
  };
  chatBtn.addEventListener("click", () => {
    // Placeholder for future chat panel
    alert("Chat coming soon. For now, this is just a mock.");
  });

  leftButtons.appendChild(copyBtn);
  leftButtons.appendChild(retryBtn);
  footer.appendChild(leftButtons);
  footer.appendChild(chatBtn);

  bubble.appendChild(header);
  bubble.appendChild(body);
  bubble.appendChild(footer);

  document.documentElement.appendChild(bubble);
}

