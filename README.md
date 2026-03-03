# twelve

A Chrome extension for instant drag-to-select text capture and simplification.

## Features

- **Drag-to-select capture**: Press `Cmd+Shift+2` (Mac) to enter selection mode, then drag over any text on a webpage
- **Instant simplification**: Automatically rewrites captured text with simpler words while preserving all details
- **Corner bubble UI**: Shows simplified text in a bottom-right bubble with Copy, Try again, and Open Chat buttons

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select this folder
5. Set your keyboard shortcut in `chrome://extensions` → "Keyboard shortcuts"

## Development

This is Session 1 of the twelve project - core capture and mock simplification.

### Project Structure

- `manifest.json` - Chrome extension manifest (Manifest v3)
- `background.js` - Service worker that handles keyboard shortcuts
- `contentScript.js` - Selection overlay, text extraction, and bubble UI

## Roadmap

- [x] Session 1: Core capture + mock simplification
- [ ] Session 2: Real LLM rewrite + chat UI + backend
- [ ] Session 3: Auth + history + companion web app

## License

MIT
