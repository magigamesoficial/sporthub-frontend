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

function isMyGroupsSection(path: string): boolean {
  if (path === "/grupos") return true;
  if (path.startsWith("/grupos/entrar") || path.startsWith("/grupos/buscar")) return false;
  if (/^\/grupos\/[^/]+/.test(path)) return true;
  return false;
}

function navActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/grupos/buscar") return pathname.startsWith("/grupos/buscar");
  if (href === "/grupos/entrar") return pathname.startsWith("/grupos/entrar");
  if (href === "/conta") return pathname === "/conta";
  if (href === "/grupos") return isMyGroupsSection(pathname);
  return false;
}

const SIDEBAR_LINKS: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Início" },
  { href: "/grupos", label: "Meus grupos" },
  { href: "/grupos/buscar", label: "Buscar grupos" },
  { href: "/grupos/entrar", label: "Entrar por código" },
  { href: "/conta", label: "Conta" },
];

export function LoggedInLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);

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

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  function onLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setUser(null);
    router.push("/login");
  }

  const authed = user != null;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-pitch-950/95 md:flex md:flex-col">
        <div className="border-b border-white/10 px-4 py-4">
          <Link href="/dashboard" className="font-display text-lg font-bold text-white">
            Sport<span className="text-turf-bright">Hub</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {SIDEBAR_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                navActive(pathname, item.href)
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3 text-xs text-slate-500">
          {user === undefined ? "…" : authed ? <span className="line-clamp-2">{user.fullName}</span> : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-pitch-950/90 backdrop-blur-md md:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/dashboard" className="font-display text-lg font-bold text-white">
              Sport<span className="text-turf-bright">Hub</span>
            </Link>
            {authed && user !== undefined ? (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-200"
              >
                Sair
              </button>
            ) : null}
            <nav className="flex w-full flex-wrap items-center gap-1 text-xs">
              {SIDEBAR_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2 py-1 ${
                    navActive(pathname, item.href)
                      ? "bg-white/10 text-white"
                      : "text-slate-400"
                  }`}
                >
                  {item.label.replace(" grupos", "")}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <header className="sticky top-0 z-20 hidden border-b border-white/10 bg-pitch-950/80 backdrop-blur-md md:block">
          <div className="flex items-center justify-end gap-3 px-6 py-3">
            {user === undefined ? (
              <span className="text-sm text-slate-500">…</span>
            ) : authed ? (
              <>
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

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
