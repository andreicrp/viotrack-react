/**
 * Dynamic On-Demand PDF Loader
 * Loads heavy jsPDF and jspdf-autotable library on demand only when the user clicks Export/Print PDF.
 * Keeps initial page bundle lightweight and ultra-fast.
 */
export async function getJsPDF(options = {}) {
  const [{ default: jsPDF }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  return new jsPDF(options);
}
