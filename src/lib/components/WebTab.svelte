<script>
  import { app, setLastUrl, clearWebCapture } from '$lib/state.svelte.js';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { onMount } from 'svelte';

  let urlInput = $state(app.lastUrl);
  let loading = $state(false);

  onMount(() => {
    const unlisten = listen('web-capture', (event) => {
      app.webCapture = event.payload;
    });
    return () => unlisten.then(fn => fn());
  });

  async function handleOpen() {
    if (!urlInput.trim()) return;
    loading = true;
    try {
      setLastUrl(urlInput.trim());
      await invoke('open_browser', { url: urlInput.trim() });
      app.browserOpen = true;
    } catch (e) {
      console.error('Failed to open browser:', e);
    }
    loading = false;
  }

  async function handleClose() {
    try {
      await invoke('close_browser');
      app.browserOpen = false;
    } catch (e) {
      console.error('Failed to close browser:', e);
    }
  }

  function handleClear() {
    clearWebCapture();
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') handleOpen();
  }
</script>

<div class="web-tab">
  <div class="url-bar">
    <input
      type="text"
      bind:value={urlInput}
      onkeydown={handleKeydown}
      placeholder="Enter URL (e.g. http://localhost:3000)"
      class="url-input"
    />
    {#if app.browserOpen}
      <button class="btn btn-secondary" onclick={handleClose}>Close</button>
    {/if}
    <button class="btn btn-primary" onclick={handleOpen} disabled={loading || !urlInput.trim()}>
      {loading ? 'Opening...' : app.browserOpen ? 'Reload' : 'Open Browser'}
    </button>
  </div>

  <div class="content">
    {#if !app.webCapture}
      <div class="empty-state">
        <div class="icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="8" width="36" height="28" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="6" y1="16" x2="42" y2="16" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="17" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="22" cy="12" r="1.5" fill="currentColor"/>
            <rect x="6" y="36" width="36" height="4" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </div>
        {#if !app.browserOpen}
          <h2>Capture a web element</h2>
          <p>Enter a URL above and click <strong>Open Browser</strong>. A browser window will open with element capture enabled — hover to highlight, click to capture.</p>
        {:else}
          <h2>Browser is open</h2>
          <p>Hover over any element to highlight it, then <strong>click to capture</strong>. The captured image will appear here.</p>
          <div class="status pulse">
            <span class="dot"></span>
            Waiting for capture...
          </div>
        {/if}
      </div>
    {:else}
      <div class="preview">
        <div class="preview-header">
          <h2>Web Capture</h2>
          <button class="btn-clear" onclick={handleClear}>Clear</button>
        </div>
        <div class="preview-image">
          <img src={app.webCapture} alt="Web element capture" />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .web-tab {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 400px;
  }

  .url-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .url-input {
    flex: 1;
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #111827;
    outline: none;
  }

  .url-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
  }

  .btn {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #6366f1;
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    background: #4f46e5;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .empty-state {
    text-align: center;
    color: #6b7280;
  }

  .empty-state .icon {
    color: #d1d5db;
    margin-bottom: 16px;
  }

  .empty-state h2 {
    font-size: 18px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px;
  }

  .empty-state p {
    font-size: 14px;
    margin: 0 0 20px;
    max-width: 380px;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    padding: 6px 14px;
    background: #f3f4f6;
    border-radius: 20px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6366f1;
  }

  .status.pulse .dot {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .preview {
    width: 100%;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .preview-header h2 {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin: 0;
  }

  .btn-clear {
    padding: 4px 12px;
    font-size: 13px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    color: #6b7280;
    cursor: pointer;
  }

  .btn-clear:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .preview-image {
    flex: 1;
    overflow: auto;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .preview-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  @media (prefers-color-scheme: dark) {
    .url-input { background: #1f2937; border-color: #4b5563; color: #f9fafb; }
    .url-input:focus { border-color: #6366f1; }
    .btn-secondary { background: #374151; border-color: #4b5563; color: #d1d5db; }
    .btn-secondary:hover { background: #4b5563; }
    .empty-state h2 { color: #e5e7eb; }
    .empty-state .icon { color: #4b5563; }
    .status { background: #374151; }
    .preview-header h2 { color: #e5e7eb; }
    .btn-clear { background: #1f2937; border-color: #4b5563; color: #9ca3af; }
    .btn-clear:hover { background: #374151; }
    .preview-image { background: #111827; border-color: #374151; }
  }
</style>
