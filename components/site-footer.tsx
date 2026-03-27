import Link from "next/link";
import { whatsappUrlFromStoredPhone } from "@/lib/format-brazil";

/** Celular de suporte (47 9 8816-9663) no formato armazenado com DDI 55. */
const SUPPORT_PHONE_STORED = "5547988169663";

export function SiteFooter() {
  const supportWhatsAppUrl = whatsappUrlFromStoredPhone(SUPPORT_PHONE_STORED);

  return (
    <footer className="border-t border-white/10 bg-pitch-950/90 px-4 py-8 text-center text-xs text-slate-500">
      <p className="text-slate-400">© 2026 Paulo Dionizio. Todos os direitos reservados.</p>
      <p className="mt-2">
        Suporte:{" "}
        <Link
          href={supportWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-400/90 underline-offset-2 hover:text-emerald-300 hover:underline"
        >
          WhatsApp (47) 9 8816-9663
        </Link>
      </p>
    </footer>
  );
}
