import pixelmatch from 'pixelmatch';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
  });
}

export async function runDiff(figmaBase64, webBase64, thresholdPercent) {
  const figmaImg = await loadImage(figmaBase64);
  const webImg = await loadImage(webBase64);

  const targetWidth = Math.min(figmaImg.width, webImg.width);
  const targetHeight = Math.min(figmaImg.height, webImg.height);

  // Draw both images at target dimensions
  const figmaCanvas = document.createElement('canvas');
  figmaCanvas.width = targetWidth;
  figmaCanvas.height = targetHeight;
  figmaCanvas.getContext('2d').drawImage(figmaImg, 0, 0, targetWidth, targetHeight);

  const webCanvas = document.createElement('canvas');
  webCanvas.width = targetWidth;
  webCanvas.height = targetHeight;
  webCanvas.getContext('2d').drawImage(webImg, 0, 0, targetWidth, targetHeight);

  const figmaData = figmaCanvas.getContext('2d').getImageData(0, 0, targetWidth, targetHeight);
  const webData = webCanvas.getContext('2d').getImageData(0, 0, targetWidth, targetHeight);

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = targetWidth;
  diffCanvas.height = targetHeight;
  const diffCtx = diffCanvas.getContext('2d');
  const diffData = diffCtx.createImageData(targetWidth, targetHeight);

  const numDiffPixels = pixelmatch(
    webData.data,
    figmaData.data,
    diffData.data,
    targetWidth,
    targetHeight,
    { threshold: thresholdPercent / 100 }
  );

  diffCtx.putImageData(diffData, 0, 0);

  const totalPixels = targetWidth * targetHeight;
  const similarity = ((totalPixels - numDiffPixels) / totalPixels * 100).toFixed(2);

  return {
    image: diffCanvas.toDataURL('image/png'),
    similarity: parseFloat(similarity),
    diffPixels: numDiffPixels,
    totalPixels,
  };
}
