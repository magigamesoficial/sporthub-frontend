/** Formata telefone armazenado (ex.: 5511999887766) para exibição (ex.: (11) 9 9988-7766). */
export function formatBrazilPhoneDisplay(stored: string): string {
  const digits = stored.replace(/\D/g, "");
  const without55 = digits.startsWith("55") ? digits.slice(2) : digits;
  if (without55.length < 10) return stored;
  const dd = without55.slice(0, 2);
  const local = without55.slice(2);
  if (local.length >= 9 && local[0] === "9") {
    return `(${dd}) ${local[0]} ${local.slice(1, 5)}-${local.slice(5, 9)}`;
  }
  if (local.length >= 8) {
    return `(${dd}) ${local.slice(0, 4)}-${local.slice(4, 8)}`;
  }
  return `(${dd}) ${local}`;
}

/** URL do WhatsApp (wa.me) a partir do telefone salvo na base (ex.: 5511999887766). */
export function whatsappUrlFromStoredPhone(stored: string): string {
  const digits = stored.replace(/\D/g, "");
  if (digits.length === 0) return "https://wa.me/";
  return `https://wa.me/${digits}`;
}
