/** Строка CSV: поля в кавычках, разделитель «;» (так Excel в uk/ru/sk-локали открывает без мастера) */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

/** Скачать текст как файл (BOM — чтобы Excel понял UTF-8) */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
