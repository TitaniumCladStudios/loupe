<script>
  import { app } from '$lib/state.svelte.js';
  import { normalizeFigmaProps, normalizeWebProps, compareProperties } from '$lib/property-utils.js';

  const figmaNorm = $derived(normalizeFigmaProps(app.figmaProperties));
  const webNorm = $derived(normalizeWebProps(app.webProperties));
  const comparison = $derived(
    figmaNorm || webNorm ? compareProperties(figmaNorm, webNorm) : null
  );

  let expandedCats = $state({});

  function toggleCat(key) {
    expandedCats[key] = !expandedCats[key];
  }

  function matchIcon(match) {
    if (match === true) return 'match';
    if (match === false) return 'mismatch';
    return 'unknown';
  }
</script>

<div class="inspect-tab">
  <p class="tab-desc" title="Compare CSS properties extracted from the Figma frame and the web capture side by side">Compare extracted CSS properties between the Figma design and web implementation.</p>

  {#if !app.figmaProperties && !app.webProperties}
    <div class="empty-state">
      <div class="icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="8" width="18" height="32" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
          <rect x="26" y="8" width="18" height="32" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M14 20h-2m2 4h-2m2 4h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M36 20h-2m2 4h-2m2 4h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h2>No properties to compare</h2>
      <p>Capture a Figma frame and a web element first. Properties are extracted automatically during capture.</p>
      <div class="empty-links">
        <button class="btn-link" onclick={() => app.activeTab = 0} title="Go to the Figma tab to capture a frame">Go to Figma</button>
        <button class="btn-link" onclick={() => app.activeTab = 1} title="Go to the Web tab to capture an element">Go to Web</button>
      </div>
    </div>
  {:else if !comparison || comparison.categories.length === 0}
    <div class="empty-state">
      <h2>Waiting for both captures</h2>
      <p>
        {#if !app.figmaProperties}Figma properties not yet received.{/if}
        {#if !app.webProperties}Web properties not yet captured.{/if}
      </p>
      <div class="empty-links">
        {#if !app.figmaProperties}
          <button class="btn-link" onclick={() => app.activeTab = 0}>Go to Figma</button>
        {/if}
        {#if !app.webProperties}
          <button class="btn-link" onclick={() => app.activeTab = 1}>Go to Web</button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="summary-bar">
      <span class="summary-stat">
        <strong>{comparison.totalMatched}</strong> / {comparison.totalProps} properties match
      </span>
      <span class="summary-pct" class:good={comparison.totalMatched / comparison.totalProps >= 0.8} class:warn={comparison.totalMatched / comparison.totalProps >= 0.5 && comparison.totalMatched / comparison.totalProps < 0.8} class:bad={comparison.totalMatched / comparison.totalProps < 0.5}>
        {Math.round(comparison.totalMatched / comparison.totalProps * 100)}%
      </span>
    </div>

    <div class="categories">
      {#each comparison.categories as cat}
        <div class="category">
          <button class="cat-header" onclick={() => toggleCat(cat.key)}>
            <span class="cat-arrow">{expandedCats[cat.key] === false ? '▶' : '▼'}</span>
            <span class="cat-label">{cat.label}</span>
            <span class="cat-summary">
              <span class="cat-count">{cat.matched}/{cat.total}</span>
              {#if cat.matched === cat.total}
                <span class="cat-badge good">All match</span>
              {:else}
                <span class="cat-badge warn">{cat.total - cat.matched} differ</span>
              {/if}
            </span>
          </button>

          {#if expandedCats[cat.key] !== false}
            <div class="cat-table">
              <div class="table-header">
                <span class="col-prop">Property</span>
                <span class="col-val">Figma</span>
                <span class="col-val">Web</span>
                <span class="col-match"></span>
              </div>
              {#each cat.rows as row}
                <div class="table-row" class:row-match={row.match === true} class:row-mismatch={row.match === false} class:row-unknown={row.match === null}>
                  <span class="col-prop">{row.prop}</span>
                  <span class="col-val" class:empty={!row.figma}>{row.figma ?? '—'}</span>
                  <span class="col-val" class:empty={!row.web}>{row.web ?? '—'}</span>
                  <span class="col-match">
                    {#if row.match === true}
                      <span class="dot green" title="Values match"></span>
                    {:else if row.match === false}
                      <span class="dot red" title="Values differ"></span>
                    {:else}
                      <span class="dot gray" title="Cannot compare — one side missing or mixed"></span>
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .inspect-tab {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 400px;
  }

  .tab-desc {
    font-size: 13px;
    color: #6b7280;
    margin: 0 0 12px;
  }

  .empty-state {
    text-align: center;
    color: #6b7280;
    margin: auto;
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
    margin: 0 0 16px;
    max-width: 400px;
  }

  .empty-links {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .btn-link {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid #6366f1;
    border-radius: 8px;
    background: transparent;
    color: #6366f1;
    cursor: pointer;
  }

  .btn-link:hover {
    background: rgba(99, 102, 241, 0.05);
  }

  /* Summary bar */
  .summary-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f3f4f6;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .summary-stat {
    font-size: 14px;
    color: #374151;
  }

  .summary-pct {
    font-size: 20px;
    font-weight: 700;
    border-radius: 6px;
    padding: 2px 10px;
  }

  .summary-pct.good { color: #16a34a; background: #f0fdf4; }
  .summary-pct.warn { color: #d97706; background: #fffbeb; }
  .summary-pct.bad { color: #dc2626; background: #fef2f2; }

  /* Categories */
  .categories {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .category {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }

  .cat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: #f9fafb;
    cursor: pointer;
    font-size: 13px;
    text-align: left;
  }

  .cat-header:hover {
    background: #f3f4f6;
  }

  .cat-arrow {
    color: #9ca3af;
    font-size: 10px;
    width: 14px;
    flex-shrink: 0;
  }

  .cat-label {
    font-weight: 600;
    color: #374151;
    flex: 1;
  }

  .cat-summary {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cat-count {
    font-size: 12px;
    color: #9ca3af;
  }

  .cat-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
  }

  .cat-badge.good { background: #dcfce7; color: #16a34a; }
  .cat-badge.warn { background: #fef3c7; color: #d97706; }

  /* Table */
  .cat-table {
    border-top: 1px solid #e5e7eb;
  }

  .table-header {
    display: grid;
    grid-template-columns: 160px 1fr 1fr 32px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: #fafafa;
  }

  .table-row {
    display: grid;
    grid-template-columns: 160px 1fr 1fr 32px;
    padding: 6px 12px;
    font-size: 13px;
    border-top: 1px solid #f3f4f6;
    align-items: center;
  }

  .table-row:hover {
    background: #fafafa;
  }

  .table-row.row-mismatch {
    background: #fef2f2;
  }

  .table-row.row-mismatch:hover {
    background: #fee2e2;
  }

  .col-prop {
    font-weight: 500;
    color: #374151;
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: 12px;
  }

  .col-val {
    color: #4b5563;
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: 12px;
    word-break: break-all;
    padding-right: 8px;
  }

  .col-val.empty {
    color: #d1d5db;
    font-style: italic;
  }

  .col-match {
    display: flex;
    justify-content: center;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }

  .dot.green { background: #22c55e; }
  .dot.red { background: #ef4444; }
  .dot.gray { background: #d1d5db; }

  @media (prefers-color-scheme: dark) {
    .tab-desc { color: #9ca3af; }
    .empty-state h2 { color: #e5e7eb; }
    .empty-state .icon { color: #4b5563; }
    .btn-link { border-color: #818cf8; color: #818cf8; }
    .summary-bar { background: #1f2937; }
    .summary-stat { color: #d1d5db; }
    .summary-pct.good { color: #4ade80; background: #052e16; }
    .summary-pct.warn { color: #fbbf24; background: #422006; }
    .summary-pct.bad { color: #f87171; background: #450a0a; }
    .category { border-color: #374151; }
    .cat-header { background: #111827; }
    .cat-header:hover { background: #1f2937; }
    .cat-label { color: #e5e7eb; }
    .cat-badge.good { background: #052e16; color: #4ade80; }
    .cat-badge.warn { background: #422006; color: #fbbf24; }
    .cat-table { border-color: #374151; }
    .table-header { background: #111827; color: #6b7280; }
    .table-row { border-color: #1f2937; }
    .table-row:hover { background: #111827; }
    .table-row.row-mismatch { background: #450a0a; }
    .table-row.row-mismatch:hover { background: #7f1d1d; }
    .col-prop { color: #d1d5db; }
    .col-val { color: #9ca3af; }
    .col-val.empty { color: #4b5563; }
  }
</style>
