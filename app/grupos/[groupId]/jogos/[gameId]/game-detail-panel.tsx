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

type AttendanceStatus = "GOING" | "MAYBE" | "NOT_GOING";

type GameDetailResponse = {
  game: {
    id: string;
    title: string;
    location: string | null;
    startsAt: string;
    createdAt: string;
    createdBy: { id: string; fullName: string } | null;
  };
  viewer: {
    userId: string;
    canManageGames: boolean;
    myStatus: AttendanceStatus | null;
  };
  members: {
    userId: string;
    fullName: string;
    phone: string;
    role: string;
    attendance: { status: AttendanceStatus; updatedAt: string } | null;
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
      setData(r.data as GameDetailResponse);
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

  const { game, viewer, members } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/grupos/${groupId}/jogos`} className="text-sm text-turf-bright hover:underline">
        ← Lista de jogos
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-white">{game.title}</h1>
      <p className="mt-2 text-lg text-turf-bright/90">{formatGameWhen(game.startsAt)}</p>
      {game.location && <p className="mt-2 text-sm text-slate-400">{game.location}</p>}
      {game.createdBy && (
        <p className="mt-1 text-xs text-slate-500">Agendado por {game.createdBy.fullName}</p>
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
