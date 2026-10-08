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

  // 1. Native Capacitor Android APK Flow (Share & Print Intent via Plugins)
  if (isNative) {
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
        if (err?.name === 'AbortError') return;
        console.warn('Native APK PDF print/share error:', err);
      }
    } else if (htmlContent) {
      try {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        await shareOrSaveNativeFile({
          filename: filename.endsWith('.html') ? filename : `${filename}.html`,
          blob: htmlBlob,
          title: title,
          mimeType: 'text/html'
        });
        onStatus?.({ type: 'success', message: 'Document ready to print / share.' });
        return;
      } catch (err) {
        console.warn('Native APK HTML print fallback failed:', err);
      }
    }
  }

  // 2. Web Browser Flow (Both Mobile Web and Desktop Web)
  if (htmlContent) {
    try {
      const isMobile = isMobileDevice();

      // On Mobile Web browsers, opening the printable view directly in a new tab triggers mobile browser print reliably
      if (isMobile) {
        onStatus?.({ type: 'info', message: 'Opening printable document...' });
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const printWin = window.open(url, '_blank');
        if (printWin) {
          printWin.onload = () => {
            try {
              printWin.focus();
              printWin.print();
            } catch (e) {}
          };
          onStatus?.({ type: 'success', message: 'Print view opened.' });
          return;
        }
      }

      onStatus?.({ type: 'info', message: 'Opening print dialog...' });

      const existing = document.getElementById('viotrack-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'viotrack-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0.01';
      iframe.style.border = '0';
      iframe.style.pointerEvents = 'none';

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
          setTimeout(() => {
            try { iframe.remove(); } catch (e) {}
          }, 3000);
        } catch (e) {
          console.warn('Iframe print failed, falling back to popup window / tab:', e);
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const printWin = window.open(url, '_blank');
          if (printWin) {
            printWin.onload = () => {
              printWin.focus();
              printWin.print();
            };
            onStatus?.({ type: 'success', message: 'Print view opened in new tab.' });
          } else {
            // Popup blocked: download HTML document
            shareOrSaveNativeFile({
              filename: filename.endsWith('.html') ? filename : `${filename}.html`,
              blob,
              title,
              mimeType: 'text/html'
            });
            onStatus?.({ type: 'info', message: 'Print view downloaded.' });
          }
        }
      }, 350);
      return;
    } catch (err) {
      console.error('Web HTML print error:', err);
    }
  }

  // 3. Web PDF Direct Generator / Viewer
  if (typeof generatePdfBlob === 'function') {
    try {
      onStatus?.({ type: 'info', message: 'Generating PDF document...' });
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
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) {
          onStatus?.({ type: 'success', message: 'PDF document opened in new tab.' });
        } else {
          // If popup is blocked, download directly
          await shareOrSaveNativeFile({
            filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
            blob: blob,
            title: title,
            mimeType: 'application/pdf'
          });
          onStatus?.({ type: 'success', message: 'PDF document downloaded.' });
        }
        return;
      }
    } catch (err) {
      console.error('Final fallback PDF error:', err);
      onStatus?.({ type: 'error', message: 'Failed to generate PDF: ' + err.message });
    }
  }
}
