/**
 * Universal Mobile Print & Native Share Helper for Viotrack
 * Optimized with Capacitor Native Plugins (@capacitor/share & @capacitor/filesystem)
 * for 100% reliable Android APK execution, plus Web/Desktop fallbacks.
 */

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const isNativeApp = () => {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
};

export const isMobileDevice = () => {
  if (isNativeApp()) return true;
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|capacitor|cordova/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || (isTouch && isSmallScreen);
};

/**
 * Converts Blob to pure Base64 string (without the data URL prefix)
 */
export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result;
      if (typeof res === 'string') {
        const parts = res.split(',');
        resolve(parts[1] || parts[0]);
      } else {
        resolve('');
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Shares or saves any file natively via Capacitor or Web Share
 */
export async function shareOrSaveNativeFile({
  filename,
  blob,
  title = 'Viotrack Export',
  mimeType = 'application/octet-stream'
}) {
  // 1. Capacitor Native APK Execution (100% Reliable Android Native Share Tray)
  if (isNativeApp()) {
    try {
      const base64Data = await blobToBase64(blob);
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true
      });

      if (writeResult && writeResult.uri) {
        await Share.share({
          title: title,
          text: title,
          url: writeResult.uri,
          files: [writeResult.uri],
          dialogTitle: title
        });
        return true;
      }
    } catch (err) {
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled') || err?.name === 'AbortError') {
        return true;
      }
      console.warn('Capacitor native share failed, falling back to Web Share / Download:', err);
    }
  }

  // 2. Mobile Web Share API Execution (Mobile Chrome / Safari)
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title,
          text: title
        });
        return true;
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') return true;
      console.warn('Web share failed, falling back to standard download link:', shareErr);
    }
  }

  // 3. Desktop / Browser Download Fallback
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.target = '_self';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 4000);
    return true;
  } catch (err) {
    console.error('Download link error:', err);
    throw err;
  }
}

/**
 * Universal document print or native share dispatcher
 */
export async function printOrShareDocument({
  title = 'Viotrack Document',
  filename = 'Viotrack_Document.pdf',
  htmlContent = '',
  generatePdfBlob,
  onStatus = () => {}
}) {
  const isNative = isNativeApp();
  const isMobile = isMobileDevice();

  // 1. Native APK or Mobile Flow: Generate high-res PDF and trigger Android Print / Share Intent
  if (isNative || isMobile) {
    if (typeof generatePdfBlob === 'function') {
      try {
        onStatus?.({ type: 'info', message: 'Generating document...' });
        const pdfOutput = await generatePdfBlob();
        
        let blob;
        if (pdfOutput instanceof Blob) {
          blob = pdfOutput;
        } else if (pdfOutput && typeof pdfOutput.output === 'function') {
          blob = pdfOutput.output('blob');
        } else if (pdfOutput instanceof ArrayBuffer) {
          blob = new Blob([pdfOutput], { type: 'application/pdf' });
        }

        if (blob) {
          const success = await shareOrSaveNativeFile({
            filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
            blob: blob,
            title: title,
            mimeType: 'application/pdf'
          });

          if (success) {
            onStatus?.({ type: 'success', message: 'Document sent to system print / share.' });
            return;
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Mobile print/share error:', err);
      }
    }
  }

  // 2. Desktop Flow: Hidden IFrame Printing
  if (htmlContent) {
    try {
      const existing = document.getElementById('viotrack-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'viotrack-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          onStatus?.({ type: 'success', message: 'Print dialog opened.' });
        } catch (e) {
          // Window fallback
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const printWin = window.open(url, '_blank');
          if (printWin) {
            printWin.onload = () => {
              printWin.focus();
              printWin.print();
            };
          }
        }
      }, 300);
      return;
    } catch (err) {
      console.error('Desktop print error:', err);
    }
  }

  // 3. Fallback: Direct PDF generator save
  if (typeof generatePdfBlob === 'function') {
    try {
      const pdfOutput = await generatePdfBlob();
      if (pdfOutput && typeof pdfOutput.save === 'function') {
        pdfOutput.save(filename);
        onStatus?.({ type: 'success', message: 'PDF saved successfully.' });
      }
    } catch (err) {
      console.error('Final fallback error:', err);
    }
  }
}
