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

  // Typography — extract from this node if TEXT, or from the first child TEXT node
  var textNode = null;
  if (node.type === 'TEXT') {
    textNode = node;
  } else if ('findOne' in node) {
    textNode = node.findOne(function(n) { return n.type === 'TEXT'; });
  }

  if (textNode) {
    props.fontSize = textNode.fontSize === figma.mixed ? 'mixed' : textNode.fontSize;

    if (textNode.fontName === figma.mixed) {
      props.fontFamily = 'mixed';
      props.fontStyle = 'mixed';
    } else if (textNode.fontName) {
      props.fontFamily = textNode.fontName.family;
      props.fontStyle = textNode.fontName.style;
    }

    if (textNode.lineHeight === figma.mixed) {
      props.lineHeight = 'mixed';
    } else if (textNode.lineHeight) {
      props.lineHeight = textNode.lineHeight;
    }

    if (textNode.letterSpacing === figma.mixed) {
      props.letterSpacing = 'mixed';
    } else if (textNode.letterSpacing) {
      props.letterSpacing = textNode.letterSpacing;
    }

    if (textNode.textAlignHorizontal) {
      props.textAlign = textNode.textAlignHorizontal;
    }

    // If we pulled typography from a child, also grab its fill as text color
    if (textNode !== node && 'fills' in textNode && textNode.fills !== figma.mixed) {
      var textFill = textNode.fills.filter(function(f) { return f.type === 'SOLID' && f.visible !== false; })[0];
      if (textFill) {
        props.textColor = {
          r: textFill.color.r,
          g: textFill.color.g,
          b: textFill.color.b,
          opacity: (textFill.opacity != null ? textFill.opacity : 1)
        };
      }
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
