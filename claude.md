# Loupe — Project Context

## What This Is

A desktop app for comparing a live web component against a Figma frame using pixel-based diffing and heatmap visualization. It replaces a manual Chrome extension workflow (previously called "Easel") with a self-contained tool: one Tauri app, one companion Figma plugin, one repo.

The original Easel extension did two things: onion skinning (injecting a canvas overlay with a transparency slider) and pixel diff via pixelmatch. Loupe promotes the diff workflow into a proper desktop workspace and drops the browser extension dependency entirely.

## Architecture

Two components, one repo:

```
loupe/
├── src/                  # Svelte frontend (Tauri app UI)
├── src-tauri/            # Rust backend (local HTTP server, Tauri config)
├── figma-plugin/
│   ├── manifest.json
│   ├── ui.html
│   └── code.js
├── package.json
└── CLAUDE.md
```

### Tauri Desktop App

The primary artifact. Built with Svelte for the UI layer and Rust for the backend.

- **Left pane:** an embedded WebView the user navigates to their live site or local dev server
- **Right pane:** receives the Figma frame image sent by the plugin, displays it statically
- **Diff view:** heatmap visualization of pixel differences between the two captured images, generated via pixelmatch
- **Local HTTP server:** runs on port `7700` inside the Rust backend, exposes a single `POST /figma` endpoint that receives a PNG payload from the Figma plugin and emits a Tauri event to the Svelte frontend

### Figma Plugin

A lightweight development plugin (loaded via manifest, not published). Stored inside the repo at `figma-plugin/`.

- Simple UI with a single "Send to Loupe" button
- Exports the currently selected Figma frame as PNG via the Figma Plugin API
- POSTs the PNG (base64) to `http://localhost:7700/figma`
- Shows success/error state

Users load it in Figma via Plugins → Development → Import plugin from manifest.

## Core Functionality

### Web Component Capture (inside the app WebView)

- Inject a hover/selection script into the WebView via Tauri's `eval` API
- On hover: highlight elements with a visible outline
- On click: capture the element's bounding rect and screenshot that region using `html2canvas` (injected into the WebView)
- Pass the resulting image data to the Svelte UI via a Tauri event or JS bridge

### Figma Frame Capture (via plugin)

- User selects a frame in Figma, clicks "Send to Loupe"
- Plugin exports the frame as PNG and POSTs to the local server
- Svelte frontend receives the image via Tauri event and populates the right pane

### Diff / Heatmap Logic

Ported directly from the Easel Chrome extension. Uses **pixelmatch** for pixel-level comparison.

Key behavior from the existing implementation:
- Both images are scaled to the smaller of the two dimensions before comparison (`Math.min` on width and height) so pixelmatch always receives same-size inputs
- pixelmatch runs with `threshold: 0.1`
- Diff pixel count and similarity percentage are calculated: `((totalPixels - numDiffPixels) / totalPixels * 100)`
- The diff result is rendered to a canvas as a heatmap image

```js
// Core diff logic (preserve this exactly)
const targetWidth = Math.min(localCanvas.width, figmaImg.width);
const targetHeight = Math.min(localCanvas.height, figmaImg.height);

// Both canvases drawn at targetWidth x targetHeight before getImageData
const numDiffPixels = pixelmatch(
  localImageData.data,
  figmaImageData.data,
  diffImageData.data,
  targetWidth,
  targetHeight,
  { threshold: 0.1 }
);

const similarityPercentage = ((totalPixels - numDiffPixels) / totalPixels * 100).toFixed(2);
```

The diff runs automatically once both images are present.

### View Modes

- **Side-by-side:** web capture left, Figma frame right, diff heatmap below or in a third panel
- **Overlay:** Figma frame stacked over web capture with an opacity slider (onion skinning, carried over from Easel)
- **Heatmap only:** just the pixelmatch output

## Key Technical Decisions

- **Tauri over Electron** — OS-native WebView, no bundled Chromium, smaller binary
- **Svelte for the UI** — preferred framework, fits well with Tauri's default template
- **No Chrome extension required** — WebView inside the app handles web capture natively
- **No session pairing or persistent connections** — HTTP POST to fixed localhost port is sufficient; app holds state for both images independently
- **Figma plugin is local only** — loaded from `figma-plugin/manifest.json`, never published
- **html2canvas for WebView capture** — injected via Tauri eval; Rust-side screenshot crate is a fallback
- **pixelmatch** for diffing — already used in Easel, preserve existing behavior exactly

## UX — Wizard Tab Flow

The app is structured as a four-tab wizard. Tabs are sequential — each one represents a step. Completed steps should show a visual indicator (checkmark, subtle highlight) so the user always knows where they are and what's left.

---

### Tab 1 — Figma

Waiting state for the Figma frame capture.

- Displays a prompt: "Open the Figma plugin, select a frame, and click Send to Loupe"
- Shows a live status indicator (waiting / received)
- Once the plugin POSTs the image, the frame renders as a preview in this tab
- A "clear" button to reset and re-capture
- Tab marked complete once a Figma image is received

### Tab 2 — Web

Embedded WebView for capturing the web component.

- WebView takes up the full tab area with a URL bar at the top
- Element picker mode is always active — hover highlights elements with an outline, click captures that element's region via html2canvas
- Captured element renders as a small thumbnail in the bottom-right corner of the WebView, with a subtle border and a clear button overlaid on it
- A "clear" button to reset and re-capture
- Tab marked complete once a web capture exists

### Tab 3 — Compare

Configuration and trigger for the diff.

- Preview thumbnails of both captured images (Figma left, Web right) so the user can confirm they have the right captures before running
- Settings:
  - **Threshold / accuracy** — pixelmatch threshold slider, displayed as a whole-number percentage (0–100%, default 10%). Converted to 0.0–1.0 before being passed to pixelmatch.
  - **Output directory** — file picker for where to save the diff image
  - **Output filename** — text input, default: `diff-{timestamp}.png`
- **Run Comparison** button — disabled if either image is missing, with a clear message indicating which is absent
- After comparison runs: similarity percentage displayed prominently, diff pixel count shown as secondary info
- On completion, automatically advance to Tab 4

### Tab 4 — Result

Diff image output and view options.

- If no comparison has been run: empty state with a message ("Run a comparison in the previous tab to see results here") and a button linking back to Tab 3
- If comparison has been run:
  - **Heatmap view** — pixelmatch diff output rendered full-size
  - **Side-by-side view** — web capture and Figma frame displayed next to each other
  - **Overlay view** — Figma frame stacked over web capture with an opacity slider (onion skinning, from Easel)
  - View mode toggle (tabs or segmented control) to switch between the three
  - Download button to save the diff image (respects output directory and filename from Tab 3)
  - Similarity percentage and diff stats shown persistently

---

### General UX Rules

- Tabs are always clickable (not locked/disabled) — the wizard order is a suggestion, not a gate
- Completed tabs show a checkmark or similar indicator
- App remembers the last URL entered in the WebView between sessions
- App remembers the last output directory between sessions

## Setup Story

1. Download and run the app (or `npm run dev` from source)
2. In Figma: Plugins → Development → Import plugin from manifest → select `figma-plugin/manifest.json`
3. Done — no extension installs, no API keys, no accounts

## Out of Scope (for now)

- Structural / property-level comparison (font sizes, spacing values, colors as data)
- Cloud sync or multi-user sessions
- Publishing the Figma plugin to the Figma Community
- Multiple simultaneous comparisons