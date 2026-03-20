// --- Figma color/value conversions ---

export function figmaColorToCSS(color, opacity = 1) {
  if (!color) return null;
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = parseFloat((opacity * (color.a ?? 1)).toFixed(2));
  if (a === 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const FONT_WEIGHT_MAP = {
  thin: 100, hairline: 100,
  extralight: 200, ultralight: 200,
  light: 300,
  regular: 400, normal: 400,
  medium: 500,
  semibold: 600, demibold: 600,
  bold: 700,
  extrabold: 800, ultrabold: 800,
  black: 900, heavy: 900,
};

export function figmaFontWeight(style) {
  if (!style) return null;
  const key = style.toLowerCase().replace(/[\s-_]/g, '');
  return FONT_WEIGHT_MAP[key] ?? style;
}

function figmaLineHeight(lh) {
  if (!lh || lh.unit === 'AUTO') return 'normal';
  if (lh.unit === 'PIXELS') return `${lh.value}px`;
  if (lh.unit === 'PERCENT') return `${(lh.value / 100).toFixed(2)}`;
  return String(lh.value);
}

function figmaLetterSpacing(ls) {
  if (!ls) return '0px';
  if (ls.unit === 'PIXELS') return `${ls.value}px`;
  if (ls.unit === 'PERCENT') return `${ls.value}%`;
  return String(ls.value);
}

function figmaShadowToCSS(effect) {
  if (!effect || effect.type !== 'DROP_SHADOW') return null;
  const c = figmaColorToCSS(effect.color, effect.color?.a ?? 1);
  const x = effect.offset?.x ?? 0;
  const y = effect.offset?.y ?? 0;
  const blur = effect.radius ?? 0;
  const spread = effect.spread ?? 0;
  return `${x}px ${y}px ${blur}px ${spread}px ${c}`;
}

// --- Normalize Figma properties into comparison format ---

export function normalizeFigmaProps(raw) {
  if (!raw) return null;
  const p = {};

  // Dimensions
  if (raw.width != null) p['width'] = `${Math.round(raw.width)}px`;
  if (raw.height != null) p['height'] = `${Math.round(raw.height)}px`;

  // Typography
  if (raw.fontSize != null) {
    if (raw.fontSize === 'mixed') p['font-size'] = 'mixed';
    else p['font-size'] = `${raw.fontSize}px`;
  }
  if (raw.fontFamily) {
    if (raw.fontFamily === 'mixed') p['font-family'] = 'mixed';
    else p['font-family'] = raw.fontFamily;
  }
  if (raw.fontStyle) {
    if (raw.fontStyle === 'mixed') p['font-weight'] = 'mixed';
    else p['font-weight'] = String(figmaFontWeight(raw.fontStyle));
  }
  if (raw.lineHeight !== undefined) {
    if (raw.lineHeight === 'mixed') p['line-height'] = 'mixed';
    else p['line-height'] = figmaLineHeight(raw.lineHeight);
  }
  if (raw.letterSpacing !== undefined) {
    if (raw.letterSpacing === 'mixed') p['letter-spacing'] = 'mixed';
    else p['letter-spacing'] = figmaLetterSpacing(raw.letterSpacing);
  }
  if (raw.textAlign) p['text-align'] = raw.textAlign.toLowerCase();

  // Colors
  if (raw.fills && raw.fills.length > 0) {
    const fill = raw.fills.find(f => f.type === 'SOLID' && f.visible !== false);
    if (fill) {
      const colorStr = figmaColorToCSS(fill.color, fill.opacity ?? 1);
      if (raw.isText) {
        p['color'] = colorStr;
      } else {
        p['background-color'] = colorStr;
      }
    } else if (raw.fills.some(f => f.type?.startsWith('GRADIENT'))) {
      const key = raw.isText ? 'color' : 'background-color';
      p[key] = 'gradient (not compared)';
    }
  }
  if (raw.opacity != null) p['opacity'] = String(parseFloat(raw.opacity.toFixed(2)));

  // Borders
  if (raw.strokes && raw.strokes.length > 0) {
    const stroke = raw.strokes.find(s => s.type === 'SOLID' && s.visible !== false);
    if (stroke) {
      p['border-color'] = figmaColorToCSS(stroke.color, stroke.opacity ?? 1);
    }
  }
  if (raw.strokeWeight != null) p['border-width'] = `${raw.strokeWeight}px`;
  if (raw.cornerRadius != null) {
    if (typeof raw.cornerRadius === 'number') {
      p['border-radius'] = `${raw.cornerRadius}px`;
    }
  }
  if (raw.cornerRadii) {
    const [tl, tr, br, bl] = raw.cornerRadii;
    p['border-radius'] = `${tl}px ${tr}px ${br}px ${bl}px`;
  }

  // Spacing
  if (raw.paddingTop != null) p['padding-top'] = `${raw.paddingTop}px`;
  if (raw.paddingRight != null) p['padding-right'] = `${raw.paddingRight}px`;
  if (raw.paddingBottom != null) p['padding-bottom'] = `${raw.paddingBottom}px`;
  if (raw.paddingLeft != null) p['padding-left'] = `${raw.paddingLeft}px`;
  if (raw.itemSpacing != null) p['gap'] = `${raw.itemSpacing}px`;

  // Effects
  if (raw.effects && raw.effects.length > 0) {
    const shadows = raw.effects
      .filter(e => e.type === 'DROP_SHADOW' && e.visible !== false)
      .map(figmaShadowToCSS)
      .filter(Boolean);
    if (shadows.length > 0) p['box-shadow'] = shadows.join(', ');

    const blurs = raw.effects.filter(e => (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') && e.visible !== false);
    if (blurs.length > 0) p['filter'] = `blur(${blurs[0].radius}px)`;
  }

  return p;
}

// --- Normalize web computed styles ---

export function normalizeWebProps(raw) {
  if (!raw) return null;
  const p = {};

  // Dimensions
  if (raw.width) p['width'] = roundPx(raw.width);
  if (raw.height) p['height'] = roundPx(raw.height);

  // Typography
  if (raw['font-size']) p['font-size'] = roundPx(raw['font-size']);
  if (raw['font-family']) p['font-family'] = raw['font-family'].split(',')[0].trim().replace(/['"]/g, '');
  if (raw['font-weight']) p['font-weight'] = raw['font-weight'];
  if (raw['line-height']) p['line-height'] = raw['line-height'] === 'normal' ? 'normal' : roundPx(raw['line-height']);
  if (raw['letter-spacing']) p['letter-spacing'] = raw['letter-spacing'] === 'normal' ? '0px' : roundPx(raw['letter-spacing']);
  if (raw['text-align']) p['text-align'] = raw['text-align'];
  if (raw['color']) p['color'] = normalizeColor(raw['color']);

  // Colors
  if (raw['background-color']) p['background-color'] = normalizeColor(raw['background-color']);
  if (raw['opacity']) p['opacity'] = raw['opacity'];

  // Borders
  const bw = [raw['border-top-width'], raw['border-right-width'], raw['border-bottom-width'], raw['border-left-width']];
  if (bw.some(v => v && v !== '0px')) {
    p['border-width'] = bw.every(v => v === bw[0]) ? roundPx(bw[0]) : bw.map(roundPx).join(' ');
  }
  const bc = [raw['border-top-color'], raw['border-right-color'], raw['border-bottom-color'], raw['border-left-color']];
  if (bc[0] && bw.some(v => v && v !== '0px')) {
    p['border-color'] = bc.every(v => v === bc[0]) ? normalizeColor(bc[0]) : bc.map(normalizeColor).join(' ');
  }
  const br = [raw['border-top-left-radius'], raw['border-top-right-radius'], raw['border-bottom-right-radius'], raw['border-bottom-left-radius']];
  if (br.some(v => v && v !== '0px')) {
    p['border-radius'] = br.every(v => v === br[0]) ? roundPx(br[0]) : br.map(roundPx).join(' ');
  }

  // Spacing
  if (raw['padding-top']) p['padding-top'] = roundPx(raw['padding-top']);
  if (raw['padding-right']) p['padding-right'] = roundPx(raw['padding-right']);
  if (raw['padding-bottom']) p['padding-bottom'] = roundPx(raw['padding-bottom']);
  if (raw['padding-left']) p['padding-left'] = roundPx(raw['padding-left']);
  if (raw['gap'] && raw['gap'] !== 'normal') p['gap'] = roundPx(raw['gap']);

  // Effects
  if (raw['box-shadow'] && raw['box-shadow'] !== 'none') p['box-shadow'] = raw['box-shadow'];
  if (raw['filter'] && raw['filter'] !== 'none') p['filter'] = raw['filter'];

  return p;
}

// --- Comparison ---

const CATEGORIES = [
  { key: 'dimensions', label: 'Dimensions', props: ['width', 'height'] },
  { key: 'typography', label: 'Typography', props: ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'color'] },
  { key: 'colors', label: 'Colors', props: ['background-color', 'opacity'] },
  { key: 'borders', label: 'Borders', props: ['border-width', 'border-color', 'border-radius'] },
  { key: 'spacing', label: 'Spacing', props: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap'] },
  { key: 'effects', label: 'Effects', props: ['box-shadow', 'filter'] },
];

export { CATEGORIES };

export function compareProperties(figma, web) {
  const results = [];

  for (const cat of CATEGORIES) {
    const rows = [];
    for (const prop of cat.props) {
      const fVal = figma?.[prop] ?? null;
      const wVal = web?.[prop] ?? null;
      if (fVal === null && wVal === null) continue;

      const match = valuesMatch(prop, fVal, wVal);
      rows.push({ prop, figma: fVal, web: wVal, match });
    }
    if (rows.length > 0) {
      const matched = rows.filter(r => r.match === true).length;
      results.push({ ...cat, rows, matched, total: rows.length });
    }
  }

  const totalMatched = results.reduce((s, c) => s + c.matched, 0);
  const totalProps = results.reduce((s, c) => s + c.total, 0);

  return { categories: results, totalMatched, totalProps };
}

function valuesMatch(prop, a, b) {
  if (a === null || b === null) return null; // one side missing
  if (a === 'mixed' || b === 'mixed') return null;
  if (a.includes('not compared') || b.includes('not compared')) return null;

  // Font family: fuzzy match
  if (prop === 'font-family') {
    return b.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(b.toLowerCase());
  }

  // Color comparison
  if (prop.includes('color') || prop === 'background-color') {
    return colorsMatch(a, b, 3);
  }

  // Numeric px values
  if (a.endsWith('px') && b.endsWith('px')) {
    return Math.abs(parseFloat(a) - parseFloat(b)) <= 1;
  }

  // Numeric plain values (opacity, font-weight)
  if (!isNaN(parseFloat(a)) && !isNaN(parseFloat(b))) {
    if (prop === 'opacity') return Math.abs(parseFloat(a) - parseFloat(b)) <= 0.05;
    if (prop === 'font-weight') return parseFloat(a) === parseFloat(b);
    return Math.abs(parseFloat(a) - parseFloat(b)) <= 1;
  }

  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// --- Helpers ---

function roundPx(val) {
  if (!val) return val;
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return `${Math.round(num * 10) / 10}px`;
}

function normalizeColor(str) {
  if (!str) return str;
  // Already rgb/rgba format from getComputedStyle
  return str.trim();
}

function parseRGB(str) {
  if (!str) return null;
  const m = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]), a: m[4] != null ? parseFloat(m[4]) : 1 };
}

function colorsMatch(a, b, tolerance) {
  const ca = parseRGB(a);
  const cb = parseRGB(b);
  if (!ca || !cb) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return (
    Math.abs(ca.r - cb.r) <= tolerance &&
    Math.abs(ca.g - cb.g) <= tolerance &&
    Math.abs(ca.b - cb.b) <= tolerance &&
    Math.abs(ca.a - cb.a) <= 0.05
  );
}
