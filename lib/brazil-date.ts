/** Converte AAAA-MM-DD para DD/MM/AAAA (exibição). */
export function formatIsoToBrazil(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function todayIsoLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/** Valida e converte DD/MM/AAAA → AAAA-MM-DD, ou null. */
export function parseBrazilToIso(text: string): string | null {
  const t = text.trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (y < 1900 || y > 2100) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (dt > today) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Aceita também AAAA-MM-DD colado no campo. */
export function parseFlexibleBirthToIso(text: string): string | null {
  const t = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, mo, d] = t.split("-").map(Number);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    if (y < 1900 || y > 2100) return null;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dt > today) return null;
    return t;
  }
  return parseBrazilToIso(t);
}

/** Máscara progressiva somente com dígitos → DD/MM/AAAA */
export function maskBrazilDateDigits(digits: string): string {
  const n = digits.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}
