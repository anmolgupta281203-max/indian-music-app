/**
 * Extracts dominant vibrant colors from an image URL using an offscreen canvas.
 * Returns primary, secondary, and glow colors as CSS RGB strings.
 */
export async function extractDominantColors(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(getDefaultAura());
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const sampleSize = 32;
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

        const colorBuckets = [];

        for (let i = 0; i < imgData.length; i += 4) {
          const red = imgData[i];
          const green = imgData[i + 1];
          const blue = imgData[i + 2];
          const alpha = imgData[i + 3];

          if (alpha < 128) continue;
          const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
          if (brightness < 25 || brightness > 235) continue;

          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const saturation = max === 0 ? 0 : (max - min) / max;
          if (saturation < 0.25) continue;

          colorBuckets.push({ r: red, g: green, b: blue, sat: saturation, bright: brightness });
        }

        if (colorBuckets.length === 0) {
          resolve(getDefaultAura());
          return;
        }

        colorBuckets.sort((a, b) => (b.sat * 1.5 + (1 - Math.abs(b.bright - 140) / 140)) - (a.sat * 1.5 + (1 - Math.abs(a.bright - 140) / 140)));

        const primary = colorBuckets[0];
        const secondary = colorBuckets.find(c => Math.abs(c.r - primary.r) + Math.abs(c.g - primary.g) + Math.abs(c.b - primary.b) > 90) 
          || colorBuckets[Math.min(colorBuckets.length - 1, 8)] 
          || { r: 168, g: 85, b: 247 };

        resolve({
          primary: `rgb(${primary.r}, ${primary.g}, ${primary.b})`,
          secondary: `rgb(${secondary.r}, ${secondary.g}, ${secondary.b})`,
          glow: `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.35)`,
          rawPrimary: primary,
          rawSecondary: secondary
        });
      } catch (e) {
        resolve(getDefaultAura());
      }
    };

    img.onerror = () => {
      resolve(getDefaultAura());
    };
  });
}

function getDefaultAura() {
  return {
    primary: '#1ed760',
    secondary: '#a855f7',
    glow: 'rgba(30, 215, 96, 0.3)',
    rawPrimary: { r: 30, g: 215, b: 96 },
    rawSecondary: { r: 168, g: 85, b: 247 }
  };
}
