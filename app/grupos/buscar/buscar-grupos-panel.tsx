"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CreateGroupModal } from "@/components/create-group-modal";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import {
  ATHLETE_SPORT_SELECT_OPTIONS,
  groupMemberRoleLabel,
  sportLabel,
} from "@/lib/athlete-labels";
import { toast } from "sonner";

const SPORTS = [{ value: "", label: "Todos os esportes" }, ...ATHLETE_SPORT_SELECT_OPTIONS];

type BrowseRow = {
  id: string;
  publicCode: string;
  name: string;
  sport: string;
  visibility: string;
  presidentId: string;
  createdAt: string;
  viewerIsMember: boolean;
  viewerPendingJoinRequestId: string | null;
  canRequestJoin: boolean;
  members: { userId: string; fullName: string; role: string; feePlanName: string | null }[];
  memberCount: number | null;
};

type ApiErr = { error?: string; code?: string };

export function BuscarGruposPanel() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sport, setSport] = useState("");
  const [rows, setRows] = useState<BrowseRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const search = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (sport) params.set("sport", sport);
      const qs = params.toString();
      const r = await apiJsonAuth<{ groups: BrowseRow[] } | ApiErr>(
        `/groups/browse${qs ? `?${qs}` : ""}`,
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível buscar grupos.");
        setRows([]);
        return;
      }
      setRows((r.data as { groups: BrowseRow[] }).groups);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, sport, router]);

  useEffect(() => {
    void search();
    // Busca inicial com filtros vazios; depois só ao enviar o formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita refetch a cada tecla em q/sport
  }, []);

  async function requestJoin(groupId: string) {
    setJoiningId(groupId);
    try {
      const r = await apiJsonAuth<unknown | ApiErr>(`/groups/${groupId}/join-requests`, {
        method: "POST",
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível enviar a solicitação.");
        return;
      }
      toast.success("Solicitação enviada. Aguarde aprovação da diretoria.");
      await search();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setJoiningId(null);
    }
  }

  async function cancelJoinRequest(groupId: string) {
    setJoiningId(groupId);
    try {
      const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
        `/groups/${groupId}/join-requests/me`,
        { method: "DELETE" },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível cancelar o pedido.");
        return;
      }
      toast.success("Pedido de entrada cancelado.");
      await search();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="w-full max-w-3xl px-4 py-10 md:px-6">
      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void search()}
      />
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="text-sm text-turf-bright hover:underline"
      >
        ← Início
      </button>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Buscar grupos</h1>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3 sm:border-0 sm:pb-0">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-turf px-4 py-2 text-xs font-bold uppercase tracking-wide text-pitch-950 hover:bg-turf-bright"
          >
            Criar grupo
          </button>
          <button
            type="button"
            onClick={() => router.push("/grupos/entrar")}
            className="rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Entrar por código
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        Grupos públicos mostram a lista de membros. Grupos privados exibem apenas o presidente até
        você fazer parte.
      </p>

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="min-w-[12rem] flex-1">
          <label className="block text-sm font-medium text-slate-300" htmlFor="bq">
            Nome ou código
          </label>
          <input
            id="bq"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: Pelada ou 123456"
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300" htmlFor="bs">
            Esporte
          </label>
          <select
            id="bs"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40 sm:w-48"
          >
            {SPORTS.map((s) => (
              <option key={s.value || "all"} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-turf px-6 py-2 font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <ul className="mt-10 space-y-4">
        {rows === null ? (
          <li className="text-slate-500">Carregando…</li>
        ) : rows.length === 0 ? (
          <li className="text-sm text-slate-500">Nenhum grupo encontrado.</li>
        ) : (
          rows.map((g) => {
            const sportPt = sportLabel(g.sport);
            return (
              <li
                key={g.id}
                className="rounded-2xl border border-white/10 bg-pitch-950/50 px-4 py-4 sm:px-6"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold text-white">{g.name}</p>
                    <p className="text-xs text-slate-500">
                      {sportPt} · Código {g.publicCode} ·{" "}
                      {g.visibility === "PUBLIC" ? (
                        <span className="text-emerald-300/90">Público</span>
                      ) : (
                        <span className="text-amber-200/90">Privado</span>
                      )}
                      {g.memberCount != null ? ` · ${g.memberCount} membros` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/grupos/${g.id}/visao`)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5"
                    >
                      Ver perfil
                    </button>
                    {g.viewerIsMember ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/grupos/${g.id}`)}
                        className="rounded-lg bg-turf px-3 py-1.5 text-sm font-semibold text-pitch-950 hover:bg-turf-bright"
                      >
                        Abrir painel
                      </button>
                    ) : g.viewerPendingJoinRequestId ? (
                      <button
                        type="button"
                        disabled={joiningId !== null}
                        onClick={() => void cancelJoinRequest(g.id)}
                        className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        {joiningId === g.id ? "…" : "Cancelar pedido"}
                      </button>
                    ) : g.canRequestJoin ? (
                      <button
                        type="button"
                        disabled={joiningId !== null}
                        onClick={() => void requestJoin(g.id)}
                        className="rounded-lg bg-turf px-3 py-1.5 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
                      >
                        {joiningId === g.id ? "…" : "Pedir para entrar"}
                      </button>
                    ) : (
                      <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-500">
                        Privado — use convite
                      </span>
                    )}
                  </div>
                </div>
                {g.members.length > 0 && (
                  <ul className="mt-4 grid gap-1 text-sm text-slate-400 sm:grid-cols-2">
                    {g.members.map((m) => (
                      <li key={`${g.id}-${m.userId}`} className="text-xs leading-snug">
                        <span className="text-slate-200">{m.fullName}</span>
                        <span className="text-slate-600"> · </span>
                        <span className="text-slate-500">{groupMemberRoleLabel(m.role)}</span>
                        <span className="mt-0.5 block text-slate-500">
                          Mensalidade:{" "}
                          <span className="text-slate-400">
                            {m.feePlanName ?? "não vinculada a um plano"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
