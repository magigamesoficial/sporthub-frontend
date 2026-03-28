"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";

type MeUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
};

type MyGroupNav = { id: string; name: string };

function pathInMeusGrupos(pathname: string): boolean {
  if (pathname === "/grupos") return true;
  if (pathname.startsWith("/grupos/buscar") || pathname.startsWith("/grupos/entrar")) {
    return false;
  }
  return /^\/grupos\/[^/]+/.test(pathname);
}

function groupPathActive(pathname: string, groupId: string): boolean {
  return pathname === `/grupos/${groupId}` || pathname.startsWith(`/grupos/${groupId}/`);
}

function sidebarLinkClass(active: boolean): string {
  return `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
  }`;
}

function subLinkClass(active: boolean): string {
  return `block rounded-md px-3 py-1.5 text-xs font-medium transition ${
    active ? "bg-white/10 text-turf-bright" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
  }`;
}

function mobileLinkClass(active: boolean): string {
  return `rounded-md px-2 py-1 ${active ? "bg-white/10 text-white" : "text-slate-400"}`;
}

export function LoggedInLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);
  const [myGroups, setMyGroups] = useState<MyGroupNav[]>([]);
  const [meusOpen, setMeusOpen] = useState(true);

  const loadMe = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setUser(null);
      return;
    }
    const r = await apiJsonAuth<{ user: MeUser } | { error?: string }>("/auth/me");
    if (r.ok) {
      setUser((r.data as { user: MeUser }).user);
    } else {
      setUser(null);
    }
  }, []);

  const fetchMyGroups = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;
    const r = await apiJsonAuth<{ groups: { group: { id: string; name: string } }[] }>(
      "/groups/mine",
    );
    if (r.ok && "groups" in r.data) {
      const rows = (r.data as { groups: { group: { id: string; name: string } }[] }).groups
        .map((row) => ({ id: row.group.id, name: row.group.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
      setMyGroups(rows);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      void fetchMyGroups();
    }
  }, [user, fetchMyGroups]);

  useEffect(() => {
    const onRefresh = () => void fetchMyGroups();
    window.addEventListener("sporthub:my-groups-changed", onRefresh);
    return () => window.removeEventListener("sporthub:my-groups-changed", onRefresh);
  }, [fetchMyGroups]);

  useEffect(() => {
    if (pathInMeusGrupos(pathname)) {
      setMeusOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [user, router]);

  function onLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setUser(null);
    router.push("/login");
  }

  const authed = user != null;
  const meusAreaActive = pathInMeusGrupos(pathname);

  if (user?.role === "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pitch-950 px-4 text-sm text-slate-400">
        Redirecionando para o painel administrativo…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-pitch-950/95 md:flex md:flex-col">
        <div className="border-b border-white/10 px-4 py-4">
          <Link href="/dashboard" className="font-display text-lg font-bold text-white">
            Sport<span className="text-turf-bright">Hub</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <Link href="/dashboard" className={sidebarLinkClass(pathname === "/dashboard")}>
            Início
          </Link>

          <div>
            <button
              type="button"
              onClick={() => setMeusOpen((v) => !v)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                meusAreaActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>Meus grupos</span>
              <span className="text-xs text-slate-500">{meusOpen ? "▼" : "▶"}</span>
            </button>
            {meusOpen && (
              <div className="ml-1 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                <Link href="/grupos" className={subLinkClass(pathname === "/grupos")}>
                  Visão geral
                </Link>
                {myGroups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/grupos/${g.id}/jogos`}
                    className={subLinkClass(groupPathActive(pathname, g.id))}
                    title={g.name}
                  >
                    <span className="line-clamp-2">{g.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/grupos/buscar"
            className={sidebarLinkClass(pathname.startsWith("/grupos/buscar"))}
          >
            Buscar grupos
          </Link>
          <Link href="/conta" className={sidebarLinkClass(pathname === "/conta")}>
            Conta
          </Link>
        </nav>
        <div className="border-t border-white/10 p-3 text-xs text-slate-500">
          {user === undefined ? (
            "…"
          ) : authed ? (
            <div className="space-y-1">
              <span className="inline-block rounded border border-turf/30 bg-turf/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-turf-bright">
                Atleta
              </span>
              <span className="line-clamp-2 block text-slate-400">{user.fullName}</span>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-pitch-950/90 backdrop-blur-md md:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className="font-display text-lg font-bold text-white">
                Sport<span className="text-turf-bright">Hub</span>
              </Link>
              {authed && user !== undefined ? (
                <span className="rounded border border-turf/30 bg-turf/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-turf-bright">
                  Atleta
                </span>
              ) : null}
            </div>
            {authed && user !== undefined ? (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-200"
              >
                Sair
              </button>
            ) : null}
            <nav className="flex w-full flex-col gap-1 text-xs">
              <Link href="/dashboard" className={mobileLinkClass(pathname === "/dashboard")}>
                Início
              </Link>
              <button
                type="button"
                onClick={() => setMeusOpen((v) => !v)}
                className={`w-full rounded-md px-2 py-1 text-left ${
                  meusAreaActive ? "bg-white/10 text-white" : "text-slate-400"
                }`}
              >
                Meus grupos {meusOpen ? "▼" : "▶"}
              </button>
              {meusOpen && (
                <div className="ml-2 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                  <Link href="/grupos" className={mobileLinkClass(pathname === "/grupos")}>
                    Visão geral
                  </Link>
                  {myGroups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/grupos/${g.id}/jogos`}
                      className={mobileLinkClass(groupPathActive(pathname, g.id))}
                    >
                      <span className="line-clamp-2">{g.name}</span>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href="/grupos/buscar"
                className={mobileLinkClass(pathname.startsWith("/grupos/buscar"))}
              >
                Buscar grupos
              </Link>
              <Link href="/conta" className={mobileLinkClass(pathname === "/conta")}>
                Conta
              </Link>
            </nav>
          </div>
        </header>

        <header className="sticky top-0 z-20 hidden border-b border-white/10 bg-pitch-950/80 backdrop-blur-md md:block">
          <div className="flex items-center justify-end gap-3 px-6 py-3">
            {user === undefined ? (
              <span className="text-sm text-slate-500">…</span>
            ) : authed ? (
              <>
                <span className="rounded-md border border-turf/35 bg-turf/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-turf-bright">
                  Atleta
                </span>
                <span className="max-w-[16rem] truncate text-sm text-slate-400">{user.fullName}</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-turf px-3 py-1.5 text-sm font-semibold text-pitch-950 hover:bg-turf-bright"
              >
                Entrar
              </Link>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
