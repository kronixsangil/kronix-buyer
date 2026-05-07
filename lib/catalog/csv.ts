// lib/catalog/csv.ts
export function parseCSV(text: string) {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  const firstLine = cleaned.split(/\r?\n/)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semiCount = (firstLine.match(/;/g) ?? []).length;
  const delim = semiCount > commaCount ? ";" : ",";

  const rows: string[][] = [];
  const lines = cleaned.split(/\r?\n/);

  for (const line of lines) {
    const row: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delim && !inQuotes) {
        row.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim());
    rows.push(row);
  }

  const headers = rows.shift();
  if (!headers) return [];

  return rows
    .filter((r) => r.some((c) => c !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
}

export function toBool01(v: string) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "sí" || s === "si";
}

export function toNum(v: string) {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}