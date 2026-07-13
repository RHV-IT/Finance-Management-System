/**
 * components/DataImporter/templateGen.js
 *
 * Generates and triggers a download of a pre-formatted CSV template
 * for any module defined in importConfig.js.
 *
 * The template includes:
 *  Row 1 — column headers (exact labels from config)
 *  Row 2 — example values  (from config.columns[].example)
 *  Row 3 — a comment row explaining each column
 *
 * POSTGRES MIGRATION NOTE:
 * The column definitions here map 1:1 to the SQL schema.
 * When you generate migrations, read importConfig.js directly.
 */
 
/**
 * Download a CSV template for a given module config.
 * @param {object} moduleConfig  - one entry from IMPORT_MODULES
 */
export function downloadTemplate(moduleConfig) {
  const { label, columns } = moduleConfig;
 
  const lines = [];
 
  // ── Row 1: Headers ───────────────────────────────────────────
  lines.push(
    columns.map(c => `"${c.label}"`).join(',')
  );
 
  // ── Row 2: Example values ────────────────────────────────────
  lines.push(
    columns.map(c => `"${c.example || ''}"`).join(',')
  );
 
  // ── Row 3: Second example row (makes it easier to see pattern)
  lines.push(
    columns.map(c => `"${c.example2 || c.example || ''}"`).join(',')
  );
 
  // ── Metadata block at bottom ─────────────────────────────────
  lines.push(''); // blank line
  lines.push(`"=== RHV ERP Import Template: ${label} ==="`);
  lines.push(`"Generated: ${new Date().toLocaleString('en-GB')}"`);
  lines.push('');
  lines.push('"COLUMN GUIDE:"');
 
  columns.forEach(c => {
    const req   = c.required ? 'REQUIRED' : 'optional';
    const type  = c.type === 'enum' ? `one of: ${(c.values || []).join(' | ')}` : c.type;
    const note  = c.note ? ` — ${c.note}` : '';
    lines.push(`"  ${c.label} [${req}, ${type}]${note}"`);
  });
 
  lines.push('');
  lines.push('"INSTRUCTIONS:"');
  lines.push('"  1. Delete rows 3 onwards (keep header row 1 and fill in your data from row 2)"');
  lines.push('"  2. Do NOT change column headers"');
  lines.push('"  3. Dates: use YYYY-MM-DD format (e.g. 2025-11-25)"');
  lines.push('"  4. Numbers: plain numbers only, no ₦ symbol or commas (e.g. 450000 not ₦450,000)"');
  lines.push('"  5. Save as CSV and upload via Settings → Data Import"');
 
  // ── Trigger download ─────────────────────────────────────────
  const csv      = lines.join('\n');
  const filename = `RHV_Template_${moduleConfig.key}.csv`;
  triggerDownload(csv, filename);
}
 
/**
 * Download a combined "All Modules" template as a multi-sheet XLSX.
 * Falls back to a ZIP of CSVs if SheetJS is not available.
 * @param {object[]} modules - all IMPORT_MODULES
 */
export async function downloadAllTemplates(modules) {
  try {
    const XLSX = await import('xlsx');
 
    const workbook = XLSX.utils.book_new();
 
    modules.forEach(mod => {
      const headers  = mod.columns.map(c => c.label);
      const examples = mod.columns.map(c => c.example || '');
      const data     = [headers, examples];
 
      const sheet = XLSX.utils.aoa_to_sheet(data);
 
      // Set column widths
      sheet['!cols'] = mod.columns.map(c => ({
        wch: Math.max(c.label.length + 4, (c.example || '').length + 2, 16),
      }));
 
      // Sanitise sheet name (Excel: max 31 chars, no special chars)
      const sheetName = mod.label.replace(/[\/\\?\*\[\]:]/g, '').slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });
 
    XLSX.writeFile(workbook, 'RHV_ERP_Import_Templates.xlsx');
  } catch {
    // SheetJS not available — fall back to downloading the first template as CSV
    console.warn('SheetJS not available, downloading first template as CSV.');
    if (modules.length > 0) downloadTemplate(modules[0]);
  }
}
 
/**
 * Generate the CSV string for a module without triggering a download.
 * Useful for previewing or testing.
 */
export function generateTemplateCSV(moduleConfig) {
  const { columns } = moduleConfig;
  const header  = columns.map(c => `"${c.label}"`).join(',');
  const example = columns.map(c => `"${c.example || ''}"`).join(',');
  return `${header}\n${example}\n`;
}
 
// ─── internal ─────────────────────────────────────────────────
 
function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}