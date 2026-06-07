/**
 * Client-side file parsing utilities for JSON, CSV, and Excel (xlsx).
 * Excel support is loaded lazily from a CDN to avoid bundling a large library.
 */

// ── Types ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XLSXLib = any;
type WindowWithXLSX = Window & { XLSX?: XLSXLib };

// ── CSV ────────────────────────────────────────────────────────────────────

/**
 * Splits one CSV row into fields, respecting quoted values and escaped quotes.
 */
function splitCsvRow(row: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parses CSV text into an array of objects keyed by the header row.
 * Handles quoted fields, commas inside quotes, and Windows line endings.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = splitCsvRow(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCsvRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] ?? '').trim();
    });
    rows.push(obj);
  }

  return rows;
}

/**
 * Converts an array of objects to a CSV string.
 * Automatically detects columns from the first object unless overridden.
 */
export function objectsToCsv(
  data: Record<string, unknown>[],
  columns?: string[],
): string {
  if (!data.length) return '';
  const cols = columns ?? Object.keys(data[0]);

  const escape = (v: unknown): string => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  return [
    cols.join(','),
    ...data.map((row) => cols.map((c) => escape(row[c])).join(',')),
  ].join('\n');
}

// ── Excel (SheetJS via CDN) ────────────────────────────────────────────────

const XLSX_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

let xlsxLoadPromise: Promise<XLSXLib> | null = null;

/**
 * Lazily loads SheetJS from a CDN and returns the XLSX namespace.
 * Subsequent calls reuse the cached promise.
 */
export function loadXlsx(): Promise<XLSXLib> {
  const w = window as WindowWithXLSX;
  if (w.XLSX) return Promise.resolve(w.XLSX);

  if (!xlsxLoadPromise) {
    xlsxLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = XLSX_CDN;
      script.onload = () => {
        const loaded = (window as WindowWithXLSX).XLSX;
        if (loaded) {
          resolve(loaded);
        } else {
          reject(new Error('SheetJS loaded but XLSX global not found'));
        }
      };
      script.onerror = () =>
        reject(
          new Error(
            'Could not load the Excel parser library. Check your internet connection.',
          ),
        );
      document.head.appendChild(script);
    });
  }

  return xlsxLoadPromise;
}

/**
 * Parses an Excel (.xlsx / .xls) file into an array of row objects.
 * Uses the first sheet only. Requires internet access to load SheetJS.
 */
export async function parseExcel(
  file: File,
): Promise<Record<string, unknown>[]> {
  const XLSX = await loadXlsx();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

/**
 * Generates an Excel template file and triggers a browser download.
 * Falls back gracefully — callers should catch and offer CSV instead.
 */
export async function downloadExcelTemplate(
  data: Record<string, unknown>[],
  filename: string,
): Promise<void> {
  const XLSX = await loadXlsx();
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}

// ── Generic download helpers ────────────────────────────────────────────────

/** Triggers a browser download of a JSON file. */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, filename);
}

/** Triggers a browser download of a CSV file. */
export function downloadCsvFile(
  data: Record<string, unknown>[],
  filename: string,
): void {
  const blob = new Blob([objectsToCsv(data)], { type: 'text/csv' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
