"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { suffix: string; label: string }[] = [
  { suffix: "jogos", label: "Eventos" },
  { suffix: "perfil", label: "Perfil" },
  { suffix: "ranking", label: "Classificação" },
  { suffix: "mensalidades", label: "Mensalidades" },
  { suffix: "caixa", label: "Caixa" },
  { suffix: "membros", label: "Membros" },
  { suffix: "configuracao", label: "Configuração" },
];

export function GroupSectionNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/grupos/${groupId}`;

  return (
    <nav className="mt-3 flex flex-wrap gap-2" aria-label="Seções do grupo">
      {ITEMS.map(({ suffix, label }) => {
        const href = `${base}/${suffix}`;
        const isActive = pathname.startsWith(`${base}/${suffix}`);

        return (
          <Link
            key={suffix}
            href={href}
            className={
              isActive
                ? "inline-flex items-center rounded-xl border border-turf/50 bg-turf/15 px-3 py-2 text-sm font-semibold text-turf-bright shadow-sm shadow-turf/10"
                : "inline-flex items-center rounded-xl border border-white/15 bg-pitch-950/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/5"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
