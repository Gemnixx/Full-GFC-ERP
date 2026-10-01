export interface CsvColumn<T> {
  key: string;
  header: string;
  value?: (row: T) => string | number | null | undefined;
}

const escape = (v: any): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export function exportCSV<T extends Record<string, any>>(
  rows: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  const headers = columns.map((c) => c.header).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escape(c.value ? c.value(row) : row[c.key])).join(',')
  );
  const csv = '\uFEFF' + [headers, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const csvFilename = (base: string, from?: Date, to?: Date): string => {
  const f = (d: Date) => d.toISOString().slice(0, 10);
  if (from && to) return `${base}-${f(from)}_to_${f(to)}`;
  return `${base}-${f(new Date())}`;
};