"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOKEN_STORAGE_KEY } from "@/lib/api";

export type AdminTab = "users" | "groups" | "sports" | "legal";

const NAV: { id: AdminTab; label: string }[] = [
  { id: "users", label: "Contas de usuários" },
  { id: "groups", label: "Grupos" },
  { id: "sports", label: "Esportes e scouts" },
  { id: "legal", label: "Termos e privacidade" },
];

export function AdminLayoutShell({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function onLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-pitch-950 md:flex-row">
      <aside className="shrink-0 border-b border-white/10 bg-pitch-900/90 md:w-56 md:border-b-0 md:border-r md:border-white/10">
        <div className="border-b border-white/10 px-4 py-4">
          <Link href="/admin" className="font-display text-lg font-bold text-white">
            Sport<span className="text-turf-bright">Hub</span>
            <span className="ml-1.5 text-xs font-semibold uppercase tracking-wide text-amber-200/95">
              Admin
            </span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition md:w-full ${
                activeTab === item.id
                  ? "bg-turf/20 text-turf-bright ring-1 ring-turf/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-3 md:block">
          <Link
            href="/dashboard"
            className="text-xs text-slate-500 transition hover:text-slate-300 hover:underline"
          >
            Abrir área do atleta
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-pitch-950/95 px-4 py-3 md:px-6">
          <h1 className="font-display text-sm font-semibold text-white md:text-base">
            Painel administrativo
          </h1>
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-200">
              ADMIN
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
