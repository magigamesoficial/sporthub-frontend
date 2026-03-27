"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { sportLabel } from "@/lib/athlete-labels";
import { toastFromApi, toastNetworkError } from "@/lib/toast";

type ApiErr = { error?: string; code?: string };

type DashboardPayload = {
  gamesPlayed: number;
  topSport: { sport: string; gamesCount: number } | null;
  groupsCount?: number;
  groupRankings: {
    groupId: string;
    groupName: string;
    sport: string;
    rank: number;
    memberCount: number;
    points: number;
  }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [dashError, setDashError] = useState(false);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const [meR, dashR] = await Promise.all([
        apiJsonAuth<{ user: { fullName: string } } | ApiErr>("/auth/me"),
        apiJsonAuth<DashboardPayload | ApiErr>("/auth/me/dashboard"),
      ]);

      if (!meR.ok || !("user" in meR.data)) {
        router.replace("/login");
        return;
      }
      setName((meR.data as { user: { fullName: string } }).user.fullName);

      if (dashR.ok && "gamesPlayed" in dashR.data) {
        setDash(dashR.data as DashboardPayload);
        setDashError(false);
      } else {
        setDash(null);
        setDashError(true);
        if (dashR.status === 403) {
          /* admin redirecionado antes — ignora */
        } else {
          toastFromApi(dashR.data as ApiErr, "Não foi possível carregar o painel.");
        }
      }
    } catch {
      toastNetworkError();
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

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

      {!dashError && dash && (
        <>
          <section className="mt-10 space-y-4">
            <h2 className="font-display text-lg font-semibold text-white">Resumo</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-pitch-900/50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Grupos que participo
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-white">
                  {dash.groupsCount ?? 0}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Crie ou entre em grupos pelo menu «Meus grupos» ou «Buscar grupos».
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-pitch-900/50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Jogos com presença
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-turf-bright">
                  {dash.gamesPlayed}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Partidas em que você marcou «Vou», em qualquer grupo, após o horário de início.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-pitch-900/50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Esporte mais frequente
                </p>
                {dash.topSport ? (
                  <>
                    <p className="mt-2 font-display text-xl font-semibold text-white">
                      {sportLabel(dash.topSport.sport)}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {dash.topSport.gamesCount}{" "}
                      {dash.topSport.gamesCount === 1 ? "jogo nesse esporte" : "jogos nesse esporte"}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Ainda não há jogos registrados com a sua presença.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold text-white">Sua posição no ranking</h2>
            <p className="mt-1 text-xs text-slate-500">
              Ordem por pontos (vitória 3, empate 1), como na tela de classificação de cada grupo.
            </p>
            {dash.groupRankings.length === 0 ? (
              <p className="mt-4 rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-6 text-sm text-slate-500">
                Entre em um grupo e participe de jogos para aparecer nos rankings.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {dash.groupRankings.map((row) => (
                  <li key={row.groupId}>
                    <Link
                      href={`/grupos/${row.groupId}/ranking`}
                      className="flex flex-col gap-1 rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3 transition hover:border-turf/30 hover:bg-pitch-900/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">{row.groupName}</p>
                        <p className="text-xs text-slate-500">{sportLabel(row.sport)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-turf-bright">
                          {row.rank}º de {row.memberCount}
                        </p>
                        <p className="text-xs text-slate-500">{row.points} pts</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {dashError && (
        <p className="mt-8 text-sm text-amber-200/90">
          Não foi possível carregar o resumo agora. Tente atualizar a página.
        </p>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push("/grupos")}
          className="w-full rounded-2xl border border-turf/25 bg-gradient-to-br from-turf/10 to-pitch-950/90 p-6 text-left transition hover:border-turf/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-turf/40"
        >
          <h2 className="font-display text-lg font-semibold text-white">Meus grupos</h2>
          <p className="mt-2 text-sm text-slate-400">Ver grupos que você participa e abrir o painel.</p>
        </button>
        <button
          type="button"
          onClick={() => router.push("/grupos/buscar")}
          className="w-full rounded-2xl border border-white/15 bg-pitch-950/60 p-6 text-left transition hover:bg-pitch-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <h2 className="font-display text-lg font-semibold text-white">Buscar grupos</h2>
          <p className="mt-2 text-sm text-slate-400">
            Listagem de todos os grupos: públicos com membros visíveis; privados só o presidente.
          </p>
        </button>
        <button
          type="button"
          onClick={() => router.push("/grupos/entrar")}
          className="w-full rounded-2xl border border-white/15 bg-pitch-950/60 p-6 text-left transition hover:bg-pitch-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <h2 className="font-display text-lg font-semibold text-white">Entrar por código</h2>
          <p className="mt-2 text-sm text-slate-400">Digite o código de 6 dígitos do grupo.</p>
        </button>
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
