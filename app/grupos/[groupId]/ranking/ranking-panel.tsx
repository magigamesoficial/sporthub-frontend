"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";
import { GroupSectionNav } from "../group-section-nav";

type MetricCol = { id: string; key: string; label: string };

type RankingRow = {
  userId: string;
  fullName: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  winRate: number;
  scouts: Record<string, number>;
};

type RankingResponse = {
  group: { id: string; name: string; sport: string };
  metrics: MetricCol[];
  rows: RankingRow[];
};

type ApiErr = { error?: string; code?: string };

type SortKey =
  | "fullName"
  | "games"
  | "wins"
  | "draws"
  | "losses"
  | "points"
  | "winRate"
  | `scout:${string}`;

function compare(a: number, b: number, dir: "asc" | "desc"): number {
  const m = dir === "asc" ? 1 : -1;
  if (a < b) return -1 * m;
  if (a > b) return 1 * m;
  return 0;
}

function cmpStr(a: string, b: string, dir: "asc" | "desc"): number {
  const m = dir === "asc" ? 1 : -1;
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" }) * m;
}

export function RankingPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<RankingResponse | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const r = await apiJsonAuth<RankingResponse | ApiErr>(`/groups/${groupId}/ranking`);
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar a classificação.");
        setData(null);
        return;
      }
      setData(r.data as RankingResponse);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
      setData(null);
    }
  }, [groupId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedRows = useMemo(() => {
    if (!data) return [];
    const rows = [...data.rows];
    const dir = sortDir;
    const key = sortKey;
    rows.sort((ra, rb) => {
      if (key === "fullName") return cmpStr(ra.fullName, rb.fullName, dir);
      if (key === "games") return compare(ra.games, rb.games, dir);
      if (key === "wins") return compare(ra.wins, rb.wins, dir);
      if (key === "draws") return compare(ra.draws, rb.draws, dir);
      if (key === "losses") return compare(ra.losses, rb.losses, dir);
      if (key === "points") return compare(ra.points, rb.points, dir);
      if (key === "winRate") return compare(ra.winRate, rb.winRate, dir);
      if (key.startsWith("scout:")) {
        const id = key.slice("scout:".length);
        return compare(ra.scouts[id] ?? 0, rb.scouts[id] ?? 0, dir);
      }
      return 0;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  function headerClick(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(k);
      setSortDir(k === "fullName" ? "asc" : "desc");
    }
  }

  function thClass(active: boolean): string {
    return `cursor-pointer select-none whitespace-nowrap px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide ${
      active ? "text-turf-bright" : "text-slate-400 hover:text-slate-200"
    }`;
  }

  if (!data) {
    return (
      <div className="w-full max-w-5xl px-4 py-10 md:px-6">
        <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
          ← Grupo
        </Link>
        <p className="mt-6 text-slate-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl px-4 py-10 md:px-6">
      <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
        ← Membros do grupo
      </Link>
      <GroupSectionNav groupId={groupId} />
      <h1 className="mt-4 font-display text-2xl font-bold text-white">
        Classificação · {data.group.name}
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Pontos: 3 vitória, 1 empate, 0 derrota — por jogo em que você marcou «Vou», o resultado
        está registrado (placar com times ou vitória/empate/derrota do grupo) e, no placar,
        você tem time definido. Aproveitamento = pontos ÷ (3 × jogos válidos). Clique nas colunas
        para ordenar.
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-pitch-950/40">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th
                className={thClass(sortKey === "fullName")}
                onClick={() => headerClick("fullName")}
              >
                Atleta {sortKey === "fullName" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th
                className={thClass(sortKey === "points")}
                onClick={() => headerClick("points")}
              >
                Pts {sortKey === "points" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th
                className={thClass(sortKey === "games")}
                onClick={() => headerClick("games")}
              >
                J {sortKey === "games" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th
                className={thClass(sortKey === "wins")}
                onClick={() => headerClick("wins")}
              >
                V {sortKey === "wins" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th
                className={thClass(sortKey === "draws")}
                onClick={() => headerClick("draws")}
              >
                E {sortKey === "draws" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th
                className={thClass(sortKey === "losses")}
                onClick={() => headerClick("losses")}
              >
                D {sortKey === "losses" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              <th
                className={thClass(sortKey === "winRate")}
                onClick={() => headerClick("winRate")}
              >
                Apr.% {sortKey === "winRate" ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </th>
              {data.metrics.map((m) => {
                const sk = `scout:${m.id}` as SortKey;
                return (
                  <th
                    key={m.id}
                    className={thClass(sortKey === sk)}
                    onClick={() => headerClick(sk)}
                  >
                    {m.label} {sortKey === sk ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.userId} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-2 py-2 font-medium text-white">{r.fullName}</td>
                <td className="px-2 py-2 text-turf-bright">{r.points}</td>
                <td className="px-2 py-2 text-slate-300">{r.games}</td>
                <td className="px-2 py-2 text-emerald-300">{r.wins}</td>
                <td className="px-2 py-2 text-amber-200/90">{r.draws}</td>
                <td className="px-2 py-2 text-red-300/80">{r.losses}</td>
                <td className="px-2 py-2 text-slate-300">
                  {r.games === 0 ? "—" : `${r.winRate.toFixed(1)}%`}
                </td>
                {data.metrics.map((m) => (
                  <td key={m.id} className="px-2 py-2 text-slate-400">
                    {r.scouts[m.id] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
