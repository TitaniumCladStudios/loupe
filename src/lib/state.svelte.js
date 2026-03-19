function loadStored(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  return localStorage.getItem(`loupe_${key}`) ?? fallback;
}

function store(key, value) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`loupe_${key}`, value);
  }
}

export const app = $state({
  activeTab: 0,
  figmaImage: null,
  webCapture: null,
  diffResult: null,
  threshold: 10,
  outputDir: loadStored('outputDir', ''),
  outputFilename: 'diff-{timestamp}.png',
  lastUrl: loadStored('lastUrl', 'http://localhost:3000'),
  viewMode: 'heatmap',
  overlayOpacity: 0.5,
  browserOpen: false,
});

export function setLastUrl(url) {
  app.lastUrl = url;
  store('lastUrl', url);
}

export function setOutputDir(dir) {
  app.outputDir = dir;
  store('outputDir', dir);
}

export function clearFigma() {
  app.figmaImage = null;
}

export function clearWebCapture() {
  app.webCapture = null;
}

export function clearDiff() {
  app.diffResult = null;
}

export function isTabComplete(index) {
  if (index === 0) return app.figmaImage !== null;
  if (index === 1) return app.webCapture !== null;
  if (index === 2) return app.diffResult !== null;
  if (index === 3) return app.diffResult !== null;
  return false;
}
