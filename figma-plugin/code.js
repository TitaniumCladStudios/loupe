if (figma.command === 'send') {
  figma.showUI(__html__, { width: 320, height: 240 });
}

function extractProperties(node) {
  const props = {};

  // Dimensions
  props.width = node.width;
  props.height = node.height;

  // Opacity
  if ('opacity' in node) props.opacity = node.opacity;

  // Fills
  if ('fills' in node && node.fills !== figma.mixed) {
    props.fills = node.fills
      .filter(f => f.visible !== false)
      .map(f => ({
        type: f.type,
        color: f.type === 'SOLID' ? { r: f.color.r, g: f.color.g, b: f.color.b } : null,
        opacity: (f.opacity != null ? f.opacity : 1),
        visible: f.visible,
      }));
  }

  // Detect if this is a text node
  props.isText = node.type === 'TEXT';

  // Typography (text nodes)
  if (node.type === 'TEXT') {
    props.fontSize = node.fontSize === figma.mixed ? 'mixed' : node.fontSize;

    if (node.fontName === figma.mixed) {
      props.fontFamily = 'mixed';
      props.fontStyle = 'mixed';
    } else if (node.fontName) {
      props.fontFamily = node.fontName.family;
      props.fontStyle = node.fontName.style;
    }

    if (node.lineHeight === figma.mixed) {
      props.lineHeight = 'mixed';
    } else if (node.lineHeight) {
      props.lineHeight = node.lineHeight;
    }

    if (node.letterSpacing === figma.mixed) {
      props.letterSpacing = 'mixed';
    } else if (node.letterSpacing) {
      props.letterSpacing = node.letterSpacing;
    }

    if (node.textAlignHorizontal) {
      props.textAlign = node.textAlignHorizontal;
    }
  }

  // Strokes / Borders
  if ('strokes' in node && node.strokes !== figma.mixed) {
    props.strokes = node.strokes
      .filter(s => s.visible !== false)
      .map(s => ({
        type: s.type,
        color: s.type === 'SOLID' ? { r: s.color.r, g: s.color.g, b: s.color.b } : null,
        opacity: (s.opacity != null ? s.opacity : 1),
      }));
  }
  if ('strokeWeight' in node) {
    props.strokeWeight = node.strokeWeight === figma.mixed ? 0 : node.strokeWeight;
  }

  // Corner radius
  if ('cornerRadius' in node) {
    if (node.cornerRadius === figma.mixed) {
      // Individual corners
      props.cornerRadii = [
        (node.topLeftRadius || 0),
        (node.topRightRadius || 0),
        (node.bottomRightRadius || 0),
        (node.bottomLeftRadius || 0),
      ];
    } else {
      props.cornerRadius = node.cornerRadius;
    }
  }

  // Spacing (auto-layout)
  if ('paddingTop' in node) {
    props.paddingTop = node.paddingTop;
    props.paddingRight = node.paddingRight;
    props.paddingBottom = node.paddingBottom;
    props.paddingLeft = node.paddingLeft;
  }
  if ('itemSpacing' in node) {
    props.itemSpacing = node.itemSpacing;
  }

  // Effects
  if ('effects' in node && node.effects.length > 0) {
    props.effects = node.effects
      .filter(e => e.visible !== false)
      .map(e => ({
        type: e.type,
        radius: e.radius,
        offset: e.offset ? { x: e.offset.x, y: e.offset.y } : null,
        spread: (e.spread || 0),
        color: e.color ? { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a } : null,
      }));
  }

  return props;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'send-to-loupe') {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Select a frame first.' });
      return;
    }

    const node = selection[0];

    try {
      figma.ui.postMessage({ type: 'status', message: 'Exporting...' });

      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 2 },
      });

      const properties = extractProperties(node);

      figma.ui.postMessage({
        type: 'exported',
        data: Array.from(bytes),
        name: node.name,
        properties,
      });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: err.toString() });
    }
  }
};
