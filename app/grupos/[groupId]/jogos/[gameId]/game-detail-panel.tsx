"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { groupMemberRoleLabel } from "@/lib/athlete-labels";
import { formatBrazilPhoneDisplay } from "@/lib/format-brazil";
import { openWhatsAppShare } from "@/lib/whatsapp-share";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  GOING: "Sim",
  MAYBE: "Talvez",
  NOT_GOING: "Não",
  WAITLIST: "Fila de espera",
};

type AttendanceStatus = "GOING" | "MAYBE" | "NOT_GOING" | "WAITLIST";
type GameKind = "MATCH" | "SOCIAL";
type SelfRsvpStatus = "GOING" | "MAYBE" | "NOT_GOING";
type ModeratorRsvpStatus = AttendanceStatus;

type TeamSide = "TEAM_A" | "TEAM_B";

type GameDetailResponse = {
  eventSettings: {
    rsvpAllowMaybe: boolean;
    rsvpDeadlineHoursBeforeStart: number | null;
    eventMaxParticipants: number | null;
    eventReservedSlots: number;
    deadlineAt: string | null;
    autoGoingCap: number | null;
  };
  game: {
    id: string;
    kind: GameKind;
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
    canModerateAttendance: boolean;
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
      waitlistEnteredAt: string | null;
      forcedByModerator: boolean;
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

function waitlistSortKey(iso: string | null | undefined): number {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

function formatEventSummaryLine(title: string, whenIso: string, location: string | null): string {
  const when = formatGameWhen(whenIso);
  const loc = location?.trim() ? `\n📍 ${location.trim()}` : "";
  return `*${title}*\n🗓 ${when}${loc}`;
}

function buildAttendanceShareText(
  title: string,
  startsAt: string,
  location: string | null,
  going: { fullName: string }[],
  notGoing: { fullName: string }[],
  waitlist: { fullName: string }[],
): string {
  const head = formatEventSummaryLine(title, startsAt, location);
  const gLines = going.map((m) => `• ${m.fullName}`).join("\n") || "—";
  const nLines = notGoing.map((m) => `• ${m.fullName}`).join("\n") || "—";
  const wLines =
    waitlist.map((m, i) => `${i + 1}. ${m.fullName}`).join("\n") || "—";
  return `${head}

*Sim (${going.length})*
${gLines}

*Não (${notGoing.length})*
${nLines}

*Fila de espera (${waitlist.length})*
${wLines}`;
}

function buildTeamsShareText(
  title: string,
  startsAt: string,
  location: string | null,
  teamA: { fullName: string }[],
  teamB: { fullName: string }[],
  unassigned: { fullName: string }[],
): string {
  const head = formatEventSummaryLine(title, startsAt, location);
  const aLines = teamA.map((m) => `• ${m.fullName}`).join("\n") || "—";
  const bLines = teamB.map((m) => `• ${m.fullName}`).join("\n") || "—";
  const uLines = unassigned.map((m) => `• ${m.fullName}`).join("\n") || "—";
  return `${head}

*Time A (${teamA.length})*
${aLines}

*Time B (${teamB.length})*
${bLines}

*Sem time (${unassigned.length})*
${uLines}`;
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
  const [moderatingUserId, setModeratingUserId] = useState<string | null>(null);

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
        toastFromApi(r.data as ApiErr, "Não foi possível carregar o evento.");
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

  async function setMyStatus(status: SelfRsvpStatus) {
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

  async function setMemberAttendanceModerator(targetUserId: string, status: ModeratorRsvpStatus) {
    setModeratingUserId(targetUserId);
    try {
      const r = await apiJsonAuth<{ attendance: { status: string } } | ApiErr>(
        `/groups/${groupId}/games/${gameId}/members/${targetUserId}/attendance`,
        { method: "PUT", body: JSON.stringify({ status }) },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível atualizar a presença.");
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
      setModeratingUserId(null);
    }
  }

  async function patchGame(
    body:
      | { mode: "scores"; teamAScore: number; teamBScore: number }
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
      const goingIds = new Set(
        data.members
          .filter((m) => m.attendance?.status === "GOING")
          .map((m) => m.userId),
      );
      const assignments = data.members
        .filter((m) => m.attendance)
        .map((m) => {
          const inGoing = goingIds.has(m.userId);
          const d = teamDraft[m.userId];
          const raw =
            d === "TEAM_A" || d === "TEAM_B" || d === ""
              ? d
              : (m.attendance?.teamSide ?? "");
          const side =
            inGoing && (raw === "TEAM_A" || raw === "TEAM_B") ? raw : null;
          return { userId: m.userId, teamSide: side };
        });
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
      toast.success("Evento removido.");
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
      <div className="w-full max-w-2xl px-4 py-10 md:px-6">
        <Link href={`/grupos/${groupId}/jogos`} className="text-sm text-turf-bright hover:underline">
          ← Eventos do grupo
        </Link>
      </div>
    );
  }

  const { game, viewer, members, scout, eventSettings } = data;
  const isMatch = game.kind === "MATCH";
  const unlocked = game.resultAndScoutUnlocked;
  const hasPlacar = game.teamAScore !== null && game.teamBScore !== null;
  /** Com resultado já lançado, o sorteio some — só ajuste manual (lesão, troca, etc.). */
  const matchResultRecorded = hasPlacar || Boolean(game.outcome);
  const canUseTeamRandomizer = viewer.canAssignTeams && !matchResultRecorded;

  const goingMembers = members.filter((m) => m.attendance?.status === "GOING");
  const waitlistMembers = [...members.filter((m) => m.attendance?.status === "WAITLIST")].sort(
    (a, b) =>
      waitlistSortKey(a.attendance?.waitlistEnteredAt) -
      waitlistSortKey(b.attendance?.waitlistEnteredAt),
  );
  const notGoingMembers = members.filter((m) => m.attendance?.status === "NOT_GOING");
  const useTeamDraftForSides = viewer.canAssignTeams;
  const sideForMember = (m: (typeof members)[number]): TeamSide | null => {
    if (useTeamDraftForSides) {
      const d = teamDraft[m.userId];
      if (d === "TEAM_A" || d === "TEAM_B") return d;
      if (d === "") return null;
      const s = m.attendance?.teamSide;
      return s === "TEAM_A" || s === "TEAM_B" ? s : null;
    }
    const s = m.attendance?.teamSide;
    return s === "TEAM_A" || s === "TEAM_B" ? s : null;
  };

  function setMemberTeamSide(userId: string, side: TeamSide | null) {
    setTeamDraft((p) => ({
      ...p,
      [userId]: side === null ? "" : side,
    }));
  }

  function teamSideButtons(m: (typeof members)[number]) {
    const side = sideForMember(m);
    const baseBtn =
      "min-h-[2rem] min-w-[2rem] rounded-lg px-2.5 py-1 text-xs font-bold transition disabled:opacity-40";
    const activeA =
      side === "TEAM_A"
        ? "bg-emerald-500/35 text-emerald-100 ring-1 ring-emerald-400/60"
        : "border border-white/15 bg-pitch-950/80 text-slate-300 hover:bg-white/10";
    const activeB =
      side === "TEAM_B"
        ? "bg-sky-500/35 text-sky-100 ring-1 ring-sky-400/60"
        : "border border-white/15 bg-pitch-950/80 text-slate-300 hover:bg-white/10";
    const activeNone =
      side === null
        ? "border border-amber-500/40 bg-amber-500/15 text-amber-100"
        : "border border-white/15 bg-pitch-950/80 text-slate-400 hover:bg-white/10";
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="Time A"
          onClick={() => setMemberTeamSide(m.userId, "TEAM_A")}
          className={`${baseBtn} ${activeA}`}
        >
          A
        </button>
        <button
          type="button"
          title="Time B"
          onClick={() => setMemberTeamSide(m.userId, "TEAM_B")}
          className={`${baseBtn} ${activeB}`}
        >
          B
        </button>
        <button
          type="button"
          title="Sem time"
          onClick={() => setMemberTeamSide(m.userId, null)}
          className={`${baseBtn} px-2 ${activeNone}`}
        >
          —
        </button>
      </div>
    );
  }
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
      toast.error("Ninguém confirmou presença (Sim) ainda.");
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

  function shareAttendanceWhatsApp() {
    const text = buildAttendanceShareText(
      game.title,
      game.startsAt,
      game.location,
      goingMembers,
      notGoingMembers,
      waitlistMembers,
    );
    openWhatsAppShare(text);
  }

  function shareTeamsWhatsApp() {
    const text = buildTeamsShareText(
      game.title,
      game.startsAt,
      game.location,
      teamAMembers,
      teamBMembers,
      unassignedMembers,
    );
    openWhatsAppShare(text);
  }

  return (
    <div className="w-full max-w-4xl px-4 py-10 md:px-6">
      <Link href={`/grupos/${groupId}/jogos`} className="text-sm text-turf-bright hover:underline">
        ← Eventos do grupo
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            game.kind === "SOCIAL"
              ? "border border-violet-400/40 bg-violet-500/15 text-violet-200"
              : "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
          }`}
        >
          {game.kind === "SOCIAL" ? "Evento social" : "Jogo / pelada"}
        </span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">{game.title}</h1>
      <p className="mt-2 text-lg text-turf-bright/90">{formatGameWhen(game.startsAt)}</p>
      {isMatch && hasPlacar && (
        <p className="mt-2 text-base font-semibold text-white">
          Placar: Time A {game.teamAScore} × {game.teamBScore} Time B
          {game.teamAScore !== null &&
          game.teamBScore !== null &&
          game.teamAScore === game.teamBScore ? (
            <span className="ml-2 text-sm font-normal text-slate-400">(empate)</span>
          ) : game.teamAScore !== null && game.teamBScore !== null ? (
            <span className="ml-2 text-sm font-normal text-slate-400">
              (
              {game.teamAScore > game.teamBScore
                ? "vitória do Time A"
                : "vitória do Time B"}
              )
            </span>
          ) : null}
        </p>
      )}
      {game.location && <p className="mt-2 text-sm text-slate-400">{game.location}</p>}
      {game.createdBy && (
        <p className="mt-1 text-xs text-slate-500">Agendado por {game.createdBy.fullName}</p>
      )}
      {isMatch && !unlocked && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Placar e scouts liberam em{" "}
          <strong>{formatUnlocks(game.resultAndScoutUnlocksAt)}</strong> (1 minuto após o horário
          marcado). Esta página atualiza sozinha.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-white/10 bg-pitch-900/60 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Confirmação</h2>
        <div className="mt-2 space-y-1 text-xs text-slate-500">
          {eventSettings.autoGoingCap != null ? (
            <p>
              Limite automático de <strong className="text-slate-300">Sim</strong> sem fila:{" "}
              <strong className="text-slate-300">{eventSettings.autoGoingCap}</strong>
              {eventSettings.eventMaxParticipants != null ? (
                <>
                  {" "}
                  (máx. {eventSettings.eventMaxParticipants} no evento
                  {eventSettings.eventReservedSlots > 0
                    ? `, ${eventSettings.eventReservedSlots} vaga(s) reservada(s)`
                    : ""}
                  )
                </>
              ) : null}
              . Acima disso, ou após o prazo abaixo, o <strong className="text-slate-300">Sim</strong>{" "}
              do atleta entra na <strong className="text-slate-300">fila</strong> (ordem de chegada).
            </p>
          ) : (
            <p>Neste grupo não há teto numérico configurado — todos os &quot;Sim&quot; entram como confirmados.</p>
          )}
          {eventSettings.deadlineAt ? (
            <p>
              Prazo para confirmações “normais”: até{" "}
              <strong className="text-slate-300">{formatUnlocks(eventSettings.deadlineAt)}</strong>
              {eventSettings.rsvpDeadlineHoursBeforeStart != null
                ? ` (${eventSettings.rsvpDeadlineHoursBeforeStart} h antes do horário do evento)`
                : ""}
              . Depois disso, novos <strong className="text-slate-300">Sim</strong> vão para a fila.
            </p>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Situação atual:{" "}
          <span className="text-slate-300">
            {viewer.myStatus ? STATUS_LABEL[viewer.myStatus] : "Ainda não respondeu"}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["GOING", "NOT_GOING"] as const).map((s) => (
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
          {eventSettings.rsvpAllowMaybe && (
            <button
              type="button"
              disabled={savingStatus}
              onClick={() => void setMyStatus("MAYBE")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                viewer.myStatus === "MAYBE"
                  ? "bg-turf text-pitch-950"
                  : "border border-white/20 text-slate-200 hover:bg-white/5"
              }`}
            >
              Talvez
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => shareAttendanceWhatsApp()}
          className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15"
        >
          Compartilhar listas no WhatsApp (Sim, Não, Fila)
        </button>
      </div>

      {waitlistMembers.length > 0 && (
        <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-6">
          <h2 className="font-display text-lg font-semibold text-sky-100">
            Fila de espera ({waitlistMembers.length})
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Ordem de chegada — entram automaticamente quando abrir vaga ou um líder confirmar alguém
            como <strong className="text-slate-300">Sim</strong>.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-200">
            {waitlistMembers.map((m) => (
              <li key={m.userId}>{m.fullName}</li>
            ))}
          </ol>
        </div>
      )}

      {isMatch && (
        <div className="mt-8 rounded-2xl border border-turf/25 bg-turf/5 p-6">
          <h2 className="font-display text-lg font-semibold text-white">Times</h2>
          <p className="mt-1 text-xs text-slate-500">
            Quem está como <strong className="text-slate-300">Sim</strong> entra na divisão. Use os
            botões <strong className="text-slate-300">A</strong>,{" "}
            <strong className="text-slate-300">B</strong> ou <strong className="text-slate-300">—</strong>{" "}
            ao lado do nome e clique em <strong className="text-slate-300">Salvar times</strong>. No
            ranking, com placar, vence quem estiver no time com mais gols; gols iguais contam como
            empate.
          </p>
          <p className="mt-2 text-xs text-amber-200/90">
            Apenas <strong>presidente</strong>, <strong>vice-presidente</strong> e{" "}
            <strong>moderadores</strong> podem alterar times. O sorteio automático só aparece até o
            placar ser lançado; depois, use os botões (ou só ajuste quem já tem time).
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
                  Sorteio desativado: placar já registrado — use A / B / — ao lado de cada atleta.
                </span>
              )}
            </div>
          )}
          {goingMembers.length > 0 && (
            <button
              type="button"
              onClick={() => shareTeamsWhatsApp()}
              className="mt-4 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/15"
            >
              Compartilhar times no WhatsApp
            </button>
          )}
          {goingMembers.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Nenhum atleta com presença <strong className="text-slate-400">Sim</strong> ainda.
            </p>
          )}
          {goingMembers.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/25 bg-pitch-950/40 p-4">
                <h3 className="text-sm font-semibold text-emerald-200">Time A ({teamAMembers.length})</h3>
                <ul className="mt-2 space-y-1.5">
                  {teamAMembers.map((m) => (
                    <li key={m.userId}>
                      {viewer.canAssignTeams ? (
                        <div className="flex min-h-[2.75rem] items-center justify-between gap-2 rounded-lg border border-white/10 bg-pitch-950/60 px-2 py-1.5">
                          <span className="min-w-0 flex-1 truncate text-sm text-white">{m.fullName}</span>
                          {teamSideButtons(m)}
                        </div>
                      ) : (
                        <span className="block min-h-[2.75rem] rounded-lg border border-white/5 bg-pitch-950/30 px-2 py-2 text-sm text-slate-200">
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
                        <div className="flex min-h-[2.75rem] items-center justify-between gap-2 rounded-lg border border-white/10 bg-pitch-950/60 px-2 py-1.5">
                          <span className="min-w-0 flex-1 truncate text-sm text-white">{m.fullName}</span>
                          {teamSideButtons(m)}
                        </div>
                      ) : (
                        <span className="block min-h-[2.75rem] rounded-lg border border-white/5 bg-pitch-950/30 px-2 py-2 text-sm text-slate-200">
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
                        <div className="flex min-h-[2.75rem] items-center justify-between gap-2 rounded-lg border border-white/10 bg-pitch-950/60 px-2 py-1.5">
                          <span className="min-w-0 flex-1 truncate text-sm text-white">{m.fullName}</span>
                          {teamSideButtons(m)}
                        </div>
                      ) : (
                        <span className="block min-h-[2.75rem] rounded-lg border border-white/5 bg-pitch-950/30 px-2 py-2 text-sm text-slate-200">
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
      )}

      {viewer.canManageGames && unlocked && isMatch && (
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
              {(hasPlacar || game.outcome) && (
                <button
                  type="button"
                  disabled={patchSaving}
                  onClick={() => void patchGame({ mode: "clear" })}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
                >
                  Limpar placar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {viewer.canManageGames && scout.optionalMetrics.length > 0 && unlocked && isMatch && (
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
            {deleting ? "Excluindo…" : "Excluir este evento"}
          </button>
        </div>
      )}

      <h2 className="mt-10 font-display text-lg font-semibold text-white">Membros</h2>
      {viewer.canModerateAttendance && (
        <p className="mt-2 text-xs text-slate-500">
          Presidente, vice, tesoureiro e moderadores podem ajustar a presença de qualquer pessoa.
          Marcar <strong className="text-slate-300">Sim</strong> pela liderança confirma no evento,
          mesmo acima do limite ou com lista cheia.
        </p>
      )}
      <ul className="mt-4 space-y-2">
        {members.map((m) => {
          const st = m.attendance?.status;
          const statusClass =
            st === "GOING"
              ? "text-emerald-300"
              : st === "NOT_GOING"
                ? "text-red-300/90"
                : st === "MAYBE"
                  ? "text-amber-200"
                  : st === "WAITLIST"
                    ? "text-sky-300"
                    : "text-slate-500";
          const modBusy = moderatingUserId === m.userId;
          return (
            <li
              key={m.userId}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{m.fullName}</p>
                <p className="text-xs text-slate-500">
                  {groupMemberRoleLabel(m.role)} · {formatBrazilPhoneDisplay(m.phone)}
                  {isMatch && m.attendance?.teamSide
                    ? ` · ${m.attendance.teamSide === "TEAM_A" ? "Time A" : "Time B"}`
                    : ""}
                  {st === "GOING" && m.attendance?.forcedByModerator ? (
                    <span className="text-violet-300"> · confirmado pela liderança</span>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <span className={`text-sm ${statusClass}`}>
                  {st ? STATUS_LABEL[st] : "Sem resposta"}
                </span>
                {viewer.canModerateAttendance && (
                  <select
                    value={st ?? ""}
                    disabled={modBusy}
                    onChange={(e) => {
                      const v = e.target.value as ModeratorRsvpStatus | "";
                      if (!v || v === st) return;
                      void setMemberAttendanceModerator(m.userId, v);
                    }}
                    className="max-w-full rounded-lg border border-white/15 bg-pitch-950 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-turf/40 disabled:opacity-50"
                  >
                    {!st ? <option value="">Definir como líder…</option> : null}
                    <option value="GOING">Sim</option>
                    <option value="NOT_GOING">Não</option>
                    {eventSettings.rsvpAllowMaybe ? <option value="MAYBE">Talvez</option> : null}
                    <option value="WAITLIST">Fila</option>
                  </select>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
