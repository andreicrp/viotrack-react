/**
 * Universal Mobile Print & Native Share Helper for Viotrack
 * Optimized for Android APK, WebViews, PWA, and Desktop Browsers.
 */

export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|capacitor|cordova/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || (isTouch && isSmallScreen);
};

/**
 * Checks if the browser / WebView environment supports Web Share with Files (PDF)
 */
export const canShareFiles = () => {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
};

/**
 * Universal document print or native share dispatcher
 * 
 * @param {Object} options
 * @param {string} options.title - Document title (e.g. "Parent Summons - Mendoza")
 * @param {string} options.filename - PDF filename (e.g. "Parent_Summons_Mendoza.pdf")
 * @param {string} options.htmlContent - HTML document for desktop iframe printing
 * @param {Function} options.generatePdfBlob - Async function returning a Blob or jsPDF instance
 * @param {Function} [options.onStatus] - Optional status message callback
 */
export async function printOrShareDocument({
  title = 'Viotrack Document',
  filename = 'Viotrack_Document.pdf',
  htmlContent = '',
  generatePdfBlob,
  onStatus = () => {}
}) {
  const isMobile = isMobileDevice();

  // 1. Mobile & APK Flow: Native Share / Android Print Spooler
  if (isMobile) {
    if (typeof generatePdfBlob === 'function') {
      try {
        onStatus?.({ type: 'info', message: 'Preparing document for mobile print / share...' });
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
          const pdfFile = new File([blob], filename, { type: 'application/pdf' });

          // If Android Web Share API supports file sharing:
          if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
              files: [pdfFile],
              title: title,
              text: `Official Viotrack Document: ${title}`
            });
            onStatus?.({ type: 'success', message: 'Document sent to system share / print.' });
            return;
          }

          // Fallback on mobile: Trigger automatic PDF download / open in native viewer
          const fileUrl = URL.createObjectURL(blob);
          const tempLink = document.createElement('a');
          tempLink.href = fileUrl;
          tempLink.download = filename;
          tempLink.target = '_blank';
          document.body.appendChild(tempLink);
          tempLink.click();
          setTimeout(() => {
            tempLink.remove();
            URL.revokeObjectURL(fileUrl);
          }, 4000);

          onStatus?.({ type: 'success', message: 'PDF downloaded. Open in your phone viewer to print.' });
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // User cancelled the share dialog
          return;
        }
        console.warn('Native mobile share failed, falling back to direct print:', err);
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

  // 3. Ultimate Fallback: Direct PDF generator download if provided
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
