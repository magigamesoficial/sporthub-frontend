"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  PRESIDENT: "Presidente",
  VICE_PRESIDENT: "Vice-presidente",
  TREASURER: "Tesoureiro",
  MODERATOR: "Moderador",
  MEMBER: "Membro",
};

const STATUS_LABEL: Record<string, string> = {
  GOING: "Vou",
  MAYBE: "Talvez",
  NOT_GOING: "Não vou",
};

const OUTCOME_LABEL: Record<string, string> = {
  WIN: "Vitória",
  DRAW: "Empate",
  LOSS: "Derrota",
};

type AttendanceStatus = "GOING" | "MAYBE" | "NOT_GOING";

type GameDetailResponse = {
  game: {
    id: string;
    title: string;
    location: string | null;
    startsAt: string;
    createdAt: string;
    outcome: string | null;
    teamAScore: number | null;
    teamBScore: number | null;
    createdBy: { id: string; fullName: string } | null;
    resultAndScoutUnlocked: boolean;
    resultAndScoutUnlocksAt: string;
  };
  viewer: {
    userId: string;
    canManageGames: boolean;
    canAssignTeams: boolean;
    myStatus: AttendanceStatus | null;
  };
  scout: {
    enabledMetricIds: string[];
    optionalMetrics: { id: string; key: string; label: string; isActive?: boolean }[];
  };
  members: {
    userId: string;
    fullName: string;
    phone: string;
    role: string;
    attendance: {
      status: AttendanceStatus;
      teamSide: string | null;
      updatedAt: string;
    } | null;
    scoutValues: { metricId: string; value: number }[];
  }[];
};

type ApiErr = { error?: string; code?: string };

function formatGameWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatUnlocks(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export function GameDetailPanel({
  groupId,
  gameId,
}: {
  groupId: string;
  gameId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<GameDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [patchSaving, setPatchSaving] = useState(false);
  const [scoutDraft, setScoutDraft] = useState<Record<string, Record<string, number>>>({});
  const [scoutSaving, setScoutSaving] = useState(false);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [teamDraft, setTeamDraft] = useState<Record<string, string>>({});
  const [teamSaving, setTeamSaving] = useState(false);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const r = await apiJsonAuth<GameDetailResponse | ApiErr>(
        `/groups/${groupId}/games/${gameId}`,
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar o jogo.");
        setData(null);
        return;
      }
      const payload = r.data as GameDetailResponse;
      setData(payload);
      setScoreA(
        payload.game.teamAScore !== null && payload.game.teamAScore !== undefined
          ? String(payload.game.teamAScore)
          : "",
      );
      setScoreB(
        payload.game.teamBScore !== null && payload.game.teamBScore !== undefined
          ? String(payload.game.teamBScore)
          : "",
      );
      const teams: Record<string, string> = {};
      for (const m of payload.members) {
        teams[m.userId] = m.attendance?.teamSide ?? "";
      }
      setTeamDraft(teams);

      const next: Record<string, Record<string, number>> = {};
      for (const m of payload.members) {
        next[m.userId] = {};
        for (const sv of m.scoutValues) {
          next[m.userId][sv.metricId] = sv.value;
        }
      }
      setScoutDraft(next);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [gameId, groupId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data || data.game.resultAndScoutUnlocked) return;
    const t = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(t);
  }, [data, load]);

  async function setMyStatus(status: AttendanceStatus) {
    setSavingStatus(true);
    try {
      const r = await apiJsonAuth<{ attendance: { status: string } } | ApiErr>(
        `/groups/${groupId}/games/${gameId}/attendance`,
        { method: "POST", body: JSON.stringify({ status }) },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível salvar.");
        return;
      }
      toast.success("Presença atualizada.");
      await load();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setSavingStatus(false);
    }
  }

  async function patchGame(
    body:
      | { mode: "scores"; teamAScore: number; teamBScore: number }
      | { mode: "legacy"; outcome: "WIN" | "DRAW" | "LOSS" }
      | { mode: "clear" },
  ) {
    setPatchSaving(true);
    try {
      const r = await apiJsonAuth<
        { game: { outcome: string | null; teamAScore: number | null; teamBScore: number | null } } | ApiErr
      >(`/groups/${groupId}/games/${gameId}`, { method: "PATCH", body: JSON.stringify(body) });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível salvar o resultado.");
        return;
      }
      toast.success("Resultado atualizado.");
      await load();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setPatchSaving(false);
    }
  }

  async function savePlacar() {
    const a = Number.parseInt(scoreA, 10);
    const b = Number.parseInt(scoreB, 10);
    if (!Number.isFinite(a) || a < 0 || !Number.isFinite(b) || b < 0) {
      toast.error("Informe gols válidos (0 ou mais) para Time A e Time B.");
      return;
    }
    await patchGame({ mode: "scores", teamAScore: a, teamBScore: b });
  }

  async function saveTeams() {
    if (!data) return;
    setTeamSaving(true);
    try {
      const assignments = data.members
        .filter((m) => m.attendance)
        .map((m) => ({
          userId: m.userId,
          teamSide:
            teamDraft[m.userId] === "TEAM_A" || teamDraft[m.userId] === "TEAM_B"
              ? teamDraft[m.userId]
              : null,
        }));
      const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
        `/groups/${groupId}/games/${gameId}/team-assignments`,
        { method: "PUT", body: JSON.stringify({ assignments }) },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível salvar os times.");
        return;
      }
      toast.success("Times atualizados.");
      await load();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setTeamSaving(false);
    }
  }

  async function saveScouts() {
    if (!data) return;
    const stats: { userId: string; metricDefinitionId: string; value: number }[] = [];
    for (const m of data.members) {
      for (const met of data.scout.optionalMetrics) {
        if (met.isActive === false) continue; // métrica desativada: não envia (histórico só leitura)
        const v = Math.max(0, Math.floor(scoutDraft[m.userId]?.[met.id] ?? 0));
        stats.push({ userId: m.userId, metricDefinitionId: met.id, value: v });
      }
    }
    setScoutSaving(true);
    try {
      const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
        `/groups/${groupId}/games/${gameId}/scout-stats`,
        { method: "PUT", body: JSON.stringify({ stats }) },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível salvar os scouts.");
        return;
      }
      toast.success("Scouts salvos.");
      await load();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setScoutSaving(false);
    }
  }

  function updateScoutCell(userId: string, metricId: string, raw: string) {
    const n = Number.parseInt(raw, 10);
    const v = Number.isFinite(n) && n >= 0 ? n : 0;
    setScoutDraft((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [metricId]: v },
    }));
  }

  async function onDelete() {
    setDeleting(true);
    try {
      const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
        `/groups/${groupId}/games/${gameId}`,
        { method: "DELETE" },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível excluir.");
        return;
      }
      toast.success("Jogo removido.");
      router.push(`/grupos/${groupId}/jogos`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/grupos/${groupId}/jogos`} className="text-sm text-turf-bright hover:underline">
          ← Jogos do grupo
        </Link>
      </div>
    );
  }

  const { game, viewer, members, scout } = data;
  const unlocked = game.resultAndScoutUnlocked;
  const hasPlacar = game.teamAScore !== null && game.teamBScore !== null;
  /** Com resultado já lançado, o sorteio some — só ajuste manual (lesão, troca, etc.). */
  const matchResultRecorded = hasPlacar || Boolean(game.outcome);
  const canUseTeamRandomizer = viewer.canAssignTeams && !matchResultRecorded;

  const goingMembers = members.filter((m) => m.attendance?.status === "GOING");
  const useTeamDraftForSides = viewer.canAssignTeams;
  const sideForMember = (m: (typeof members)[number]): "TEAM_A" | "TEAM_B" | null => {
    if (useTeamDraftForSides) {
      const d = teamDraft[m.userId] ?? "";
      return d === "TEAM_A" || d === "TEAM_B" ? d : null;
    }
    const s = m.attendance?.teamSide;
    return s === "TEAM_A" || s === "TEAM_B" ? s : null;
  };
  const teamAMembers = goingMembers.filter((m) => sideForMember(m) === "TEAM_A");
  const teamBMembers = goingMembers.filter((m) => sideForMember(m) === "TEAM_B");
  const unassignedMembers = goingMembers.filter((m) => sideForMember(m) === null);

  function randomizeTeams() {
    if (matchResultRecorded) {
      toast.error("Sorteio não está disponível após o resultado do jogo ser lançado.");
      return;
    }
    const ids = goingMembers.map((m) => m.userId);
    if (ids.length === 0) {
      toast.error('Ninguém marcou "Vou" ainda.');
      return;
    }
    const shuffled = [...ids];
    shuffleInPlace(shuffled);
    const cut = Math.ceil(shuffled.length / 2);
    setTeamDraft((prev) => {
      const next = { ...prev };
      for (let i = 0; i < shuffled.length; i++) {
        next[shuffled[i]!] = i < cut ? "TEAM_A" : "TEAM_B";
      }
      return next;
    });
    toast.success("Times sorteados. Ajuste se quiser e clique em Salvar times.");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href={`/grupos/${groupId}/jogos`} className="text-sm text-turf-bright hover:underline">
        ← Lista de jogos
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-white">{game.title}</h1>
      <p className="mt-2 text-lg text-turf-bright/90">{formatGameWhen(game.startsAt)}</p>
      {hasPlacar && (
        <p className="mt-2 text-base font-semibold text-white">
          Placar: Time A {game.teamAScore} × {game.teamBScore} Time B
        </p>
      )}
      {!hasPlacar && game.outcome && (
        <p className="mt-2 text-sm font-medium text-emerald-200/90">
          Resultado (modo simples): {OUTCOME_LABEL[game.outcome] ?? game.outcome}
        </p>
      )}
      {game.location && <p className="mt-2 text-sm text-slate-400">{game.location}</p>}
      {game.createdBy && (
        <p className="mt-1 text-xs text-slate-500">Agendado por {game.createdBy.fullName}</p>
      )}
      {!unlocked && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Placar e scouts liberam em{" "}
          <strong>{formatUnlocks(game.resultAndScoutUnlocksAt)}</strong> (1 minuto após o horário
          marcado). Esta página atualiza sozinha.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-white/10 bg-pitch-900/60 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Sua presença</h2>
        <p className="mt-1 text-xs text-slate-500">
          Situação atual:{" "}
          <span className="text-slate-300">
            {viewer.myStatus ? STATUS_LABEL[viewer.myStatus] : "Ainda não respondeu"}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["GOING", "MAYBE", "NOT_GOING"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={savingStatus}
              onClick={() => void setMyStatus(s)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                viewer.myStatus === s
                  ? "bg-turf text-pitch-950"
                  : "border border-white/20 text-slate-200 hover:bg-white/5"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-turf/25 bg-turf/5 p-6">
          <h2 className="font-display text-lg font-semibold text-white">Times</h2>
          <p className="mt-1 text-xs text-slate-500">
            Quem marcou &quot;Vou&quot; entra na divisão. Com placar, vitória / empate / derrota no
            ranking seguem o lado de cada um. Após definir os times, eles aparecem nas colunas; quem
            faltar aparece em &quot;Ainda sem time&quot;.
          </p>
          <p className="mt-2 text-xs text-amber-200/90">
            Apenas <strong>presidente</strong>, <strong>vice-presidente</strong> e{" "}
            <strong>moderadores</strong> podem alterar times. O sorteio automático só aparece até o
            resultado do jogo ser informado (placar ou vitória/empate/derrota); depois disso dá para
            ajustar times só manualmente.
          </p>
          {viewer.canAssignTeams && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {canUseTeamRandomizer && (
                <button
                  type="button"
                  onClick={() => randomizeTeams()}
                  className="rounded-xl border border-white/20 bg-pitch-950/60 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-pitch-950"
                >
                  Sortear times aleatoriamente
                </button>
              )}
              <button
                type="button"
                disabled={teamSaving}
                onClick={() => void saveTeams()}
                className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
              >
                {teamSaving ? "Salvando…" : "Salvar times"}
              </button>
              {viewer.canAssignTeams && matchResultRecorded && (
                <span className="text-xs text-slate-500">
                  Sorteio desativado: resultado já registrado — use os menus ao lado de cada atleta.
                </span>
              )}
            </div>
          )}
          {goingMembers.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">Nenhum atleta marcou &quot;Vou&quot; ainda.</p>
          )}
          {goingMembers.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/25 bg-pitch-950/40 p-4">
                <h3 className="text-sm font-semibold text-emerald-200">Time A ({teamAMembers.length})</h3>
                <ul className="mt-2 space-y-1.5">
                  {teamAMembers.map((m) => (
                    <li key={m.userId}>
                      {viewer.canAssignTeams ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-pitch-950/60 px-2 py-1.5">
                          <span className="text-sm text-white">{m.fullName}</span>
                          <select
                            value={teamDraft[m.userId] ?? ""}
                            onChange={(e) =>
                              setTeamDraft((p) => ({ ...p, [m.userId]: e.target.value }))
                            }
                            className="max-w-[9rem] rounded-lg border border-white/15 bg-pitch-950 px-2 py-1 text-xs text-white"
                          >
                            <option value="TEAM_A">Time A</option>
                            <option value="TEAM_B">Time B</option>
                            <option value="">Sem time</option>
                          </select>
                        </div>
                      ) : (
                        <span className="block rounded-lg border border-white/5 bg-pitch-950/30 px-2 py-1.5 text-sm text-slate-200">
                          {m.fullName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-sky-500/25 bg-pitch-950/40 p-4">
                <h3 className="text-sm font-semibold text-sky-200">Time B ({teamBMembers.length})</h3>
                <ul className="mt-2 space-y-1.5">
                  {teamBMembers.map((m) => (
                    <li key={m.userId}>
                      {viewer.canAssignTeams ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-pitch-950/60 px-2 py-1.5">
                          <span className="text-sm text-white">{m.fullName}</span>
                          <select
                            value={teamDraft[m.userId] ?? ""}
                            onChange={(e) =>
                              setTeamDraft((p) => ({ ...p, [m.userId]: e.target.value }))
                            }
                            className="max-w-[9rem] rounded-lg border border-white/15 bg-pitch-950 px-2 py-1 text-xs text-white"
                          >
                            <option value="TEAM_A">Time A</option>
                            <option value="TEAM_B">Time B</option>
                            <option value="">Sem time</option>
                          </select>
                        </div>
                      ) : (
                        <span className="block rounded-lg border border-white/5 bg-pitch-950/30 px-2 py-1.5 text-sm text-slate-200">
                          {m.fullName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-pitch-950/40 p-4">
                <h3 className="text-sm font-semibold text-amber-200">
                  Ainda sem time ({unassignedMembers.length})
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {unassignedMembers.map((m) => (
                    <li key={m.userId}>
                      {viewer.canAssignTeams ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-pitch-950/60 px-2 py-1.5">
                          <span className="text-sm text-white">{m.fullName}</span>
                          <select
                            value={teamDraft[m.userId] ?? ""}
                            onChange={(e) =>
                              setTeamDraft((p) => ({ ...p, [m.userId]: e.target.value }))
                            }
                            className="max-w-[9rem] rounded-lg border border-white/15 bg-pitch-950 px-2 py-1 text-xs text-white"
                          >
                            <option value="">Sem time</option>
                            <option value="TEAM_A">Time A</option>
                            <option value="TEAM_B">Time B</option>
                          </select>
                        </div>
                      ) : (
                        <span className="block rounded-lg border border-white/5 bg-pitch-950/30 px-2 py-1.5 text-sm text-slate-200">
                          {m.fullName}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

      {viewer.canManageGames && unlocked && (
        <div className="mt-8 space-y-8">
          <div className="rounded-2xl border border-turf/25 bg-turf/5 p-6">
            <h2 className="font-display text-lg font-semibold text-white">Placar (Time A × Time B)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Ex.: 2 × 1. Depois lance gols e assistências nos scouts (se o grupo habilitou).
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-slate-400" htmlFor="sa">
                  Time A
                </label>
                <input
                  id="sa"
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="mt-1 w-20 rounded-lg border border-white/15 bg-pitch-950 px-2 py-2 text-white"
                />
              </div>
              <span className="pb-2 text-slate-500">×</span>
              <div>
                <label className="block text-xs text-slate-400" htmlFor="sb">
                  Time B
                </label>
                <input
                  id="sb"
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="mt-1 w-20 rounded-lg border border-white/15 bg-pitch-950 px-2 py-2 text-white"
                />
              </div>
              <button
                type="button"
                disabled={patchSaving}
                onClick={() => void savePlacar()}
                className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
              >
                Salvar placar
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-pitch-950/40 p-6">
            <h2 className="font-display text-lg font-semibold text-white">Resultado simples</h2>
            <p className="mt-1 text-xs text-slate-500">
              Sem placar: todo mundo que foi como &quot;Vou&quot; recebe o mesmo V/E/D (útil se o
              jogo foi contra time de fora).
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["WIN", "DRAW", "LOSS"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={patchSaving}
                  onClick={() => void patchGame({ mode: "legacy", outcome: o })}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                    !hasPlacar && game.outcome === o
                      ? "bg-turf text-pitch-950"
                      : "border border-white/20 text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {OUTCOME_LABEL[o]}
                </button>
              ))}
              <button
                type="button"
                disabled={patchSaving}
                onClick={() => void patchGame({ mode: "clear" })}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 disabled:opacity-50"
              >
                Limpar resultado
              </button>
            </div>
          </div>
        </div>
      )}

      {viewer.canManageGames && scout.optionalMetrics.length > 0 && unlocked && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-pitch-950/50 p-6">
          <h2 className="font-display text-lg font-semibold text-white">Scouts opcionais</h2>
          <p className="mt-1 text-xs text-slate-500">
            Gols, assistências, etc. (conforme configurado no grupo). Use 0 para apagar. Colunas de
            métricas desativadas pela plataforma ficam só leitura.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-500">
                  <th className="py-2 pr-3 font-medium">Atleta</th>
                  {scout.optionalMetrics.map((met) => (
                    <th key={met.id} className="py-2 px-1 font-medium text-slate-400">
                      {met.label}
                      {met.isActive === false ? (
                        <span className="ml-1 text-[0.65rem] font-normal text-amber-200/80">
                          (desativada)
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b border-white/5">
                    <td className="py-2 pr-3 text-slate-200">
                      <span className="font-medium text-white">{m.fullName}</span>
                    </td>
                    {scout.optionalMetrics.map((met) => (
                      <td key={met.id} className="py-1 px-1">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          disabled={met.isActive === false}
                          title={
                            met.isActive === false
                              ? "Métrica desativada na plataforma — valores antigos permanecem visíveis."
                              : undefined
                          }
                          value={
                            scoutDraft[m.userId]?.[met.id] === undefined
                              ? ""
                              : scoutDraft[m.userId]![met.id]
                          }
                          onChange={(e) => updateScoutCell(m.userId, met.id, e.target.value)}
                          className="w-16 rounded border border-white/15 bg-pitch-950 px-2 py-1 text-white outline-none focus:ring-1 focus:ring-turf/50 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={scoutSaving}
            onClick={() => void saveScouts()}
            className="mt-4 rounded-xl bg-turf px-5 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
          >
            {scoutSaving ? "Salvando…" : "Salvar scouts"}
          </button>
        </div>
      )}

      {viewer.canManageGames && (
        <div className="mt-6">
          <button
            type="button"
            disabled={deleting}
            onClick={() => void onDelete()}
            className="text-sm text-red-300 underline decoration-red-500/50 hover:text-red-200 disabled:opacity-50"
          >
            {deleting ? "Excluindo…" : "Excluir este jogo"}
          </button>
        </div>
      )}

      <h2 className="mt-10 font-display text-lg font-semibold text-white">Membros</h2>
      <ul className="mt-4 space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex flex-col gap-1 rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-white">{m.fullName}</p>
              <p className="text-xs text-slate-500">
                {ROLE_LABELS[m.role] ?? m.role} · {m.phone}
                {m.attendance?.teamSide
                  ? ` · ${m.attendance.teamSide === "TEAM_A" ? "Time A" : "Time B"}`
                  : ""}
              </p>
            </div>
            <span
              className={`text-sm ${
                m.attendance?.status === "GOING"
                  ? "text-emerald-300"
                  : m.attendance?.status === "NOT_GOING"
                    ? "text-red-300/90"
                    : m.attendance?.status === "MAYBE"
                      ? "text-amber-200"
                      : "text-slate-500"
              }`}
            >
              {m.attendance ? STATUS_LABEL[m.attendance.status] : "Sem resposta"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
