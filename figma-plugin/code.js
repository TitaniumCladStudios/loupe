if (figma.command === 'send') {
  figma.showUI(__html__, { width: 320, height: 240 });
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

      figma.ui.postMessage({
        type: 'exported',
        data: Array.from(bytes),
        name: node.name,
      });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: err.toString() });
    }
  }
};
