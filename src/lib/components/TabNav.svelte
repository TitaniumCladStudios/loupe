<script>
  import { app, isTabComplete } from '$lib/state.svelte.js';

  const tabs = ['Figma', 'Web', 'Compare', 'Result', 'Inspect'];
  const tabTips = [
    'Receive a design frame from Figma via the companion plugin',
    'Open a browser and capture a web element for comparison',
    'Configure and run a pixel-level diff between captures',
    'View the comparison results as a heatmap, side by side, or overlay',
    'Compare CSS properties between the Figma design and web implementation'
  ];
</script>

<nav class="tab-nav">
  {#each tabs as label, i}
    <button
      class="tab-btn"
      class:active={app.activeTab === i}
      class:complete={isTabComplete(i)}
      onclick={() => app.activeTab = i}
      title={tabTips[i]}
    >
      {#if isTabComplete(i)}
        <span class="check">&#10003;</span>
      {:else}
        <span class="step">{i + 1}</span>
      {/if}
      {label}
    </button>
  {/each}
</nav>

<style>
  .tab-nav {
    display: flex;
    gap: 2px;
    background: #e5e7eb;
    padding: 4px;
    border-radius: 10px;
    margin-bottom: 16px;
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    color: #374151;
    background: rgba(255, 255, 255, 0.5);
  }

  .tab-btn.active {
    background: #fff;
    color: #111827;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .tab-btn.complete .check {
    color: #22c55e;
    font-weight: 700;
  }

  .step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #d1d5db;
    color: #6b7280;
    font-size: 11px;
    font-weight: 600;
  }

  .tab-btn.active .step {
    background: #6366f1;
    color: #fff;
  }

  .check {
    font-size: 14px;
  }

  @media (prefers-color-scheme: dark) {
    .tab-nav {
      background: #374151;
    }
    .tab-btn {
      color: #9ca3af;
    }
    .tab-btn:hover {
      color: #d1d5db;
      background: rgba(255, 255, 255, 0.06);
    }
    .tab-btn.active {
      background: #1f2937;
      color: #f9fafb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .step {
      background: #4b5563;
      color: #9ca3af;
    }
    .tab-btn.active .step {
      background: #6366f1;
      color: #fff;
    }
  }
</style>
