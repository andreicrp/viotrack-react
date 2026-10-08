/**
 * Dynamic On-Demand PDF Utilities
 * Loads jsPDF, jspdf-autotable, and pdfjs-dist dynamically to keep initial bundle ultra lightweight.
 */

// Image to Base64 with in-memory caching and fetch + canvas fallback
const imageBase64Cache = new Map();

export async function loadPublicImageAsBase64(src) {
  if (!src) return null;
  if (imageBase64Cache.has(src)) {
    return imageBase64Cache.get(src);
  }

  // 1. Direct fetch to blob and convert via FileReader (cleanest, eliminates canvas CORS/taint)
  try {
    const res = await fetch(src);
    if (res.ok) {
      const blob = await res.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (base64 && typeof base64 === 'string' && base64.startsWith('data:image')) {
        imageBase64Cache.set(src, base64);
        return base64;
      }
    }
  } catch {}

  // 2. Fallback to Image element with canvas conversion
  try {
    const base64 = await new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(null);
      const img = new Image();
      const timer = setTimeout(() => resolve(null), 1000);
      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 80;
          canvas.height = img.naturalHeight || img.height || 80;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = src;
    });
    if (base64) {
      imageBase64Cache.set(src, base64);
      return base64;
    }
  } catch {}

  return null;
}

// PDF Exporter
export async function getJsPDF(options = {}) {
  const [jsPdfModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const jsPDF = jsPdfModule.jsPDF || jsPdfModule.default;
  const autoTable = autoTableModule.default || autoTableModule.autoTable;

  if (typeof autoTableModule.applyPlugin === 'function') {
    try {
      autoTableModule.applyPlugin(jsPdfModule);
    } catch {
      try {
        autoTableModule.applyPlugin(jsPDF);
      } catch {}
    }
  }

  const doc = new jsPDF(options);

  if (typeof doc.autoTable !== 'function' && typeof autoTable === 'function') {
    doc.autoTable = function (tableOptions) {
      return autoTable(this, tableOptions);
    };
  }

  return doc;
}

// PDF Text & Table Extractor
export async function extractTextFromPdf(fileOrArrayBuffer) {
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source for browser environment
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
    }
  }

  let arrayBuffer;
  if (fileOrArrayBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrArrayBuffer;
  } else if (fileOrArrayBuffer instanceof Blob) {
    arrayBuffer = await fileOrArrayBuffer.arrayBuffer();
  } else {
    throw new Error('Unsupported file format for PDF extraction.');
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const rawLines = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items || [];

    // Group items by vertical line (Y coordinate with tolerance)
    const lineBuckets = [];
    const TOLERANCE = 4; // pixels tolerance for row grouping

    for (const item of items) {
      if (!item.str || !item.str.trim()) continue;
      const y = item.transform[5];
      const x = item.transform[4];

      let bucket = lineBuckets.find(b => Math.abs(b.y - y) <= TOLERANCE);
      if (!bucket) {
        bucket = { y, items: [] };
        lineBuckets.push(bucket);
      }
      bucket.items.push({ x, text: item.str.trim() });
    }

    // Sort buckets top to bottom (descending Y)
    lineBuckets.sort((a, b) => b.y - a.y);

    for (const bucket of lineBuckets) {
      // Sort tokens left to right (ascending X)
      bucket.items.sort((a, b) => a.x - b.x);
      const rowTokens = bucket.items.map(it => it.text);
      if (rowTokens.length > 0) {
        rawLines.push(rowTokens);
      }
    }
  }

  return {
    numPages,
    rawLines,
    fullText: rawLines.map(r => r.join(' ')).join('\n')
  };
}

// Student Roster PDF Parser
export function parseStudentRosterFromPdfLines(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) return [];

  const candidates = [];
  const GRADE_REGEX = /Grade\s*(7|8|9|10|11|12)|\b(G7|G8|G9|G10|G11|G12)\b/i;
  const ID_REGEX = /\b(1092\d{6,8}|\d{11,12}|\d{6,12})\b/;
  const PHONE_REGEX = /\b(09\d{9}|\+639\d{9})\b/;

  for (const lineTokens of rawLines) {
    const joined = lineTokens.join(' ');
    
    // Skip general header titles or document metadata
    if (
      joined.toLowerCase().includes('university of perpetual help') ||
      joined.toLowerCase().includes('viotrack') ||
      joined.toLowerCase().includes('page break') ||
      joined.toLowerCase().includes('official student roster') ||
      joined.toLowerCase().includes('republic of the philippines')
    ) {
      continue;
    }

    // Skip table header rows
    if (
      (joined.toLowerCase().includes('student id') || joined.toLowerCase().includes('lrn')) &&
      joined.toLowerCase().includes('name')
    ) {
      continue;
    }

    // Attempt to extract fields
    let studentId = '';
    let fname = '';
    let mname = '';
    let lname = '';
    let grade = 'Grade 10';
    let section = 'Rizal';
    let gender = 'Male';
    let contact = '09151234567';
    let parentName = 'Parent / Guardian';
    let parentContact = '09151234568';
    let strand = '';

    // 1. Detect ID/LRN
    const idMatch = joined.match(ID_REGEX);
    if (idMatch) {
      studentId = idMatch[1];
    }

    // 2. Detect Grade
    const gradeMatch = joined.match(GRADE_REGEX);
    if (gradeMatch) {
      const gNum = gradeMatch[1] || gradeMatch[2].replace(/[^0-9]/g, '');
      grade = `Grade ${gNum}`;
    }

    // 3. Detect Gender
    if (/\b(Female|F)\b/i.test(joined)) {
      gender = 'Female';
    } else if (/\b(Male|M)\b/i.test(joined)) {
      gender = 'Male';
    }

    // 4. Detect Strand
    if (/\bSTEM\b/i.test(joined)) strand = 'STEM';
    else if (/\bABM\b/i.test(joined)) strand = 'ABM';
    else if (/\bHUMSS\b/i.test(joined)) strand = 'HUMSS';
    else if (/\bGAS\b/i.test(joined)) strand = 'GAS';
    else if (/\bTVL\b/i.test(joined)) strand = 'TVL';
    else if (/\bJHS\b/i.test(joined) || grade.includes('7') || grade.includes('8') || grade.includes('9') || grade.includes('10')) {
      strand = 'Junior High School';
    }

    // 5. Detect Names
    // If structured tokens e.g. [#, ID, LastName, FirstName, ...]
    const cleanTokens = lineTokens.filter(t => !/^\d+$/.test(t) || t.length >= 6); // remove pure row numbers like 1, 2, 3
    
    // Check if there is a "LastName, FirstName" format
    const commaIndex = cleanTokens.findIndex(t => t.includes(','));
    if (commaIndex !== -1) {
      const namePart = cleanTokens[commaIndex];
      const parts = namePart.split(',');
      lname = parts[0]?.trim() || '';
      fname = parts[1]?.trim() || '';
      if (cleanTokens[commaIndex + 1] && !cleanTokens[commaIndex + 1].includes('Grade') && !ID_REGEX.test(cleanTokens[commaIndex + 1])) {
        if (!fname) fname = cleanTokens[commaIndex + 1];
        else mname = cleanTokens[commaIndex + 1];
      }
    } else {
      // Find candidate name words
      const nameWords = cleanTokens.filter(t => 
        /^[A-Za-z\s.\-]+$/.test(t) && 
        !['Male', 'Female', 'M', 'F', 'Grade', 'STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'JHS', 'Roster', 'Student'].includes(t)
      );
      if (nameWords.length >= 2) {
        fname = nameWords[0];
        lname = nameWords[nameWords.length - 1];
        if (nameWords.length > 2) {
          mname = nameWords.slice(1, -1).join(' ');
        }
      } else if (nameWords.length === 1) {
        fname = nameWords[0];
        lname = 'Student';
      }
    }

    // 6. Section fallback
    const sectionCandidate = cleanTokens.find(t => 
      ['Bonifacio', 'Rizal', 'Luna', 'Aguinaldo', 'STEM A', 'STEM B', 'HUMSS A', 'HUMSS B', 'ABM A', 'GAS A', 'IT Era'].some(s => s.toLowerCase() === t.toLowerCase())
    );
    if (sectionCandidate) section = sectionCandidate;

    // 7. Phone numbers
    const phoneMatches = joined.match(new RegExp(PHONE_REGEX, 'g'));
    if (phoneMatches && phoneMatches.length >= 1) contact = phoneMatches[0];
    if (phoneMatches && phoneMatches.length >= 2) parentContact = phoneMatches[1];

    if (fname || studentId) {
      if (!studentId) {
        studentId = `10928374${Math.floor(1000 + Math.random() * 9000)}`;
      }
      candidates.push({
        student_id: studentId,
        fname: fname || 'Student',
        mname: mname || '',
        lname: lname || 'Roster',
        grade,
        section,
        gender,
        contact,
        parent_name: parentName,
        parent_contact: parentContact,
        strand
      });
    }
  }

  return candidates;
}

// Teacher Roster PDF Parser
export function parseTeacherRosterFromPdfLines(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) return [];

  const candidates = [];
  const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/;
  const PHONE_REGEX = /\b(09\d{9}|\+639\d{9})\b/;

  for (const lineTokens of rawLines) {
    const joined = lineTokens.join(' ');
    
    // Skip headers
    if (
      joined.toLowerCase().includes('university of perpetual help') ||
      joined.toLowerCase().includes('viotrack') ||
      joined.toLowerCase().includes('faculty directory') ||
      joined.toLowerCase().includes('academic rank') ||
      (joined.toLowerCase().includes('email') && joined.toLowerCase().includes('department'))
    ) {
      continue;
    }

    let fname = '';
    let mname = '';
    let lname = '';
    let email = '';
    let contact = '09181112233';
    let department = 'Academic Faculty';
    let position = 'Teacher I';
    let specialization = 'General Education';
    let gender = 'Male';

    // Email
    const emailMatch = joined.match(EMAIL_REGEX);
    if (emailMatch) email = emailMatch[0];

    // Phone
    const phoneMatch = joined.match(PHONE_REGEX);
    if (phoneMatch) contact = phoneMatch[0];

    // Gender
    if (/\b(Female|F)\b/i.test(joined)) gender = 'Female';
    else if (/\b(Male|M)\b/i.test(joined)) gender = 'Male';

    // Department
    if (/Science/i.test(joined)) department = 'Science Department';
    else if (/Math/i.test(joined)) department = 'Mathematics Department';
    else if (/English/i.test(joined)) department = 'English Department';
    else if (/Social/i.test(joined) || /Filipino/i.test(joined)) department = 'Social Studies';
    else if (/MAPEH/i.test(joined)) department = 'MAPEH Department';
    else if (/ICT|Tech/i.test(joined)) department = 'TVL / ICT Department';

    // Names
    const cleanTokens = lineTokens.filter(t => 
      !EMAIL_REGEX.test(t) && 
      !PHONE_REGEX.test(t) && 
      !/^\d+$/.test(t) &&
      !['Male', 'Female', 'Teacher', 'Master', 'Adviser'].includes(t)
    );

    if (cleanTokens.length >= 2) {
      fname = cleanTokens[0];
      lname = cleanTokens[cleanTokens.length - 1];
      if (cleanTokens.length > 2) {
        mname = cleanTokens.slice(1, -1).join(' ');
      }
    } else if (cleanTokens.length === 1) {
      fname = cleanTokens[0];
      lname = 'Educator';
    }

    if (fname) {
      if (!email) {
        email = `${fname.toLowerCase()}.${lname.toLowerCase()}@viotrack.edu`;
      }
      candidates.push({
        fname,
        mname,
        lname,
        email,
        contact,
        department,
        position,
        specialization,
        gender
      });
    }
  }

  return candidates;
}

// Admin Roster PDF Parser
export function parseAdminRosterFromPdfLines(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) return [];

  const candidates = [];
  const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/;
  const PHONE_REGEX = /\b(09\d{9}|\+639\d{9})\b/;

  for (const lineTokens of rawLines) {
    const joined = lineTokens.join(' ');
    
    // Skip headers
    if (
      joined.toLowerCase().includes('university of perpetual help') ||
      joined.toLowerCase().includes('viotrack') ||
      joined.toLowerCase().includes('administrators registry') ||
      (joined.toLowerCase().includes('email') && joined.toLowerCase().includes('role'))
    ) {
      continue;
    }

    let fname = '';
    let lname = '';
    let email = '';
    let contact = '09171112233';
    let role = 'Admin';
    let status = 'Active';

    const emailMatch = joined.match(EMAIL_REGEX);
    if (emailMatch) email = emailMatch[0];

    const phoneMatch = joined.match(PHONE_REGEX);
    if (phoneMatch) contact = phoneMatch[0];

    if (/Super/i.test(joined)) role = 'Super Admin';
    else if (/Discipline/i.test(joined)) role = 'Discipline Officer';
    else if (/Staff/i.test(joined)) role = 'Admin Staff';

    const cleanTokens = lineTokens.filter(t => 
      !EMAIL_REGEX.test(t) && 
      !PHONE_REGEX.test(t) && 
      !/^\d+$/.test(t) &&
      !['Admin', 'Super', 'Active', 'Officer'].includes(t)
    );

    if (cleanTokens.length >= 2) {
      fname = cleanTokens[0];
      lname = cleanTokens[cleanTokens.length - 1];
    } else if (cleanTokens.length === 1) {
      fname = cleanTokens[0];
      lname = 'Admin';
    }

    if (fname) {
      if (!email) email = `${fname.toLowerCase()}.${lname.toLowerCase()}@viotrack.edu`;
      candidates.push({
        fname,
        lname,
        email,
        contact,
        role,
        status
      });
    }
  }

  return candidates;
}

// Violation Types PDF Parser
export function parseViolationRosterFromPdfLines(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) return [];

  const candidates = [];

  for (const lineTokens of rawLines) {
    const joined = lineTokens.join(' ');
    
    // Skip headers
    if (
      joined.toLowerCase().includes('university of perpetual help') ||
      joined.toLowerCase().includes('viotrack') ||
      joined.toLowerCase().includes('violation catalog') ||
      (joined.toLowerCase().includes('severity') && joined.toLowerCase().includes('title'))
    ) {
      continue;
    }

    let type = 'Minor';
    if (/\b(Major|Severe|Critical)\b/i.test(joined)) type = 'Major';
    else if (/\b(Serious|Medium)\b/i.test(joined)) type = 'Major';
    else if (/\b(Minor|Light)\b/i.test(joined)) type = 'Minor';

    const cleanTokens = lineTokens.filter(t => 
      !/^\d+$/.test(t) && 
      !['Major', 'Minor', 'Severity', 'Default', 'Sanction'].includes(t)
    );

    if (cleanTokens.length >= 1) {
      const title = cleanTokens.join(' ');
      if (title.length >= 4) {
        candidates.push({
          title,
          type,
          description: `Infraction classified under ${type} violations policy.`,
          default_sanction: type === 'Major' ? 'Parent Summon & Written Reprimand' : 'Verbal Warning & Counseling'
        });
      }
    }
  }

  return candidates;
}
