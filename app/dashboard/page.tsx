"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    void (async () => {
      const r = await apiJsonAuth<{ user: { fullName: string } }>("/auth/me");
      if (r.ok) {
        setName((r.data as { user: { fullName: string } }).user.fullName);
      } else {
        router.replace("/login");
      }
    })();
  }, [router]);

  if (!name) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
        Olá, {name.split(" ")[0]}!
      </h1>
      <p className="mt-2 text-slate-400">
        Use o menu — na barra lateral no computador ou no topo no celular — para seus grupos, busca e
        conta.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/grupos"
          className="rounded-2xl border border-turf/25 bg-gradient-to-br from-turf/10 to-pitch-950/90 p-6 transition hover:border-turf/50"
        >
          <h2 className="font-display text-lg font-semibold text-white">Meus grupos</h2>
          <p className="mt-2 text-sm text-slate-400">Ver grupos que você participa e abrir o painel.</p>
        </Link>
        <Link
          href="/grupos/buscar"
          className="rounded-2xl border border-white/15 bg-pitch-950/60 p-6 transition hover:bg-pitch-900/80"
        >
          <h2 className="font-display text-lg font-semibold text-white">Buscar grupos</h2>
          <p className="mt-2 text-sm text-slate-400">
            Listagem de todos os grupos: públicos com membros visíveis; privados só o presidente.
          </p>
        </Link>
        <Link
          href="/grupos/entrar"
          className="rounded-2xl border border-white/15 bg-pitch-950/60 p-6 transition hover:bg-pitch-900/80"
        >
          <h2 className="font-display text-lg font-semibold text-white">Entrar por código</h2>
          <p className="mt-2 text-sm text-slate-400">Digite o código de 6 dígitos do grupo.</p>
        </Link>
        <Link
          href="/conta"
          className="rounded-2xl border border-white/15 bg-pitch-950/60 p-6 transition hover:bg-pitch-900/80"
        >
          <h2 className="font-display text-lg font-semibold text-white">Conta</h2>
          <p className="mt-2 text-sm text-slate-400">Dados da sua inscrição no SportHub.</p>
        </Link>
      </div>
    </div>
  );
}
