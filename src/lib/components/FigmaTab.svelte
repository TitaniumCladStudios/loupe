<script>
  import { app, clearFigma } from '$lib/state.svelte.js';
  import { listen } from '@tauri-apps/api/event';
  import { onMount } from 'svelte';

  let status = $state('waiting');

  onMount(() => {
    const unlisten = listen('figma-image', (event) => {
      app.figmaImage = event.payload;
      status = 'received';
    });
    return () => unlisten.then(fn => fn());
  });

  function handleClear() {
    clearFigma();
    status = 'waiting';
  }
</script>

<div class="figma-tab">
  {#if !app.figmaImage}
    <div class="empty-state">
      <div class="icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="4" width="32" height="40" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <circle cx="24" cy="20" r="6" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M12 36 L20 28 L28 32 L36 24" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <h2>Waiting for Figma frame</h2>
      <p>Open the Figma plugin, select a frame, and click <strong>Send to Loupe</strong></p>
      <div class="status" class:pulse={status === 'waiting'}>
        <span class="dot"></span>
        {status === 'waiting' ? 'Listening on port 7700...' : 'Received'}
      </div>
    </div>
  {:else}
    <div class="preview">
      <div class="preview-header">
        <h2>Figma Frame</h2>
        <button class="btn-clear" onclick={handleClear}>Clear</button>
      </div>
      <div class="preview-image">
        <img src={app.figmaImage.startsWith('data:') ? app.figmaImage : `data:image/png;base64,${app.figmaImage}`} alt="Figma frame" />
      </div>
    </div>
  {/if}
</div>

<style>
  .figma-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 400px;
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
    max-width: 360px;
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
    .empty-state h2 { color: #e5e7eb; }
    .empty-state .icon { color: #4b5563; }
    .status { background: #374151; }
    .preview-header h2 { color: #e5e7eb; }
    .btn-clear { background: #1f2937; border-color: #4b5563; color: #9ca3af; }
    .btn-clear:hover { background: #374151; }
    .preview-image { background: #111827; border-color: #374151; }
  }
</style>
