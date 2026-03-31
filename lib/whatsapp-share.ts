/** Abre o WhatsApp Web/App com texto pré-preenchido (lista de presença, times, etc.). */
export function openWhatsAppShare(text: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
