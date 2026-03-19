<script>
  import { app } from '$lib/state.svelte.js';
  import TabNav from '$lib/components/TabNav.svelte';
  import FigmaTab from '$lib/components/FigmaTab.svelte';
  import WebTab from '$lib/components/WebTab.svelte';
  import CompareTab from '$lib/components/CompareTab.svelte';
  import ResultTab from '$lib/components/ResultTab.svelte';
</script>

<div class="app">
  <header class="app-header">
    <h1 class="app-title">Loupe</h1>
  </header>

  <TabNav />

  <main class="tab-content">
    {#if app.activeTab === 0}
      <FigmaTab />
    {:else if app.activeTab === 1}
      <WebTab />
    {:else if app.activeTab === 2}
      <CompareTab />
    {:else if app.activeTab === 3}
      <ResultTab />
    {/if}
  </main>
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #111827;
    background: #f9fafb;
    -webkit-font-smoothing: antialiased;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 16px 20px;
    overflow: hidden;
  }

  .app-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .app-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    color: #111827;
    letter-spacing: -0.01em;
  }

  .tab-content {
    flex: 1;
    overflow: auto;
  }

  @media (prefers-color-scheme: dark) {
    :global(body) {
      color: #f9fafb;
      background: #111827;
    }
    .app-title {
      color: #f9fafb;
    }
  }
</style>
