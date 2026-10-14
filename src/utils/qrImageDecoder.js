import { Html5Qrcode } from 'html5-qrcode';

/**
 * Preprocesses and normalizes image on canvas for low-contrast or large photos
 */
export const preprocessQRImage = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(null);

      let width = img.width;
      let height = img.height;
      const maxDim = 800;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], 'preprocessed-qr.png', { type: 'image/png' }) : null);
      }, 'image/png');
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Multi-engine decoding for QR code from an image file
 */
export const decodeQRFromImage = async (file, hiddenContainerId = 'qr-hidden-file-decoder') => {
  let decodedText = null;

  // Strategy 1: Native Chrome/Edge BarcodeDetector API
  if ('BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const imgBitmap = await createImageBitmap(file);
      const detectedCodes = await detector.detect(imgBitmap);
      if (detectedCodes && detectedCodes.length > 0) {
        decodedText = detectedCodes[0].rawValue;
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 2: Dedicated Html5Qrcode instance on hidden container
  if (!decodedText) {
    try {
      const tempScanner = new Html5Qrcode(hiddenContainerId, { verbose: false });
      decodedText = await tempScanner.scanFile(file, false);
      await tempScanner.clear().catch(() => {});
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Canvas multi-scale normalization
  if (!decodedText) {
    try {
      const processedBlob = await preprocessQRImage(file);
      if (processedBlob) {
        const tempScanner = new Html5Qrcode(hiddenContainerId, { verbose: false });
        decodedText = await tempScanner.scanFile(processedBlob, false);
        await tempScanner.clear().catch(() => {});
      }
    } catch {
      // Failed all strategies
    }
  }

  return decodedText;
};
