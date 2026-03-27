"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { groupMemberRoleLabel } from "@/lib/athlete-labels";
import { formatBrazilPhoneDisplay } from "@/lib/format-brazil";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";
import { GroupSectionNav } from "./group-section-nav";
import { ScoutsSettingsPanel } from "./scouts/scouts-settings-panel";

type ApiErr = { error?: string; code?: string };

type FeePlanRow = { id: string; name: string; amountCents: number };

type SettingsMember = {
  userId: string;
  fullName: string;
  role: string;
  feePlan: FeePlanRow | null;
  feeStatus: "em_dia" | "em_atraso" | "sem_plano";
  phone: string;
  email: string;
};

type SettingsResponse = {
  periodMonth: string;
  group: {
    id: string;
    name: string;
    sport: string;
    visibility: string;
    statuteUrl: string | null;
    localRulesNote: string | null;
    richPublicProfile: boolean;
    presidentId: string;
  };
  viewer: { canEditSettings: boolean };
  feePlans: FeePlanRow[];
  members: SettingsMember[];
};

const GROUP_ROLES = [
  "PRESIDENT",
  "VICE_PRESIDENT",
  "TREASURER",
  "MODERATOR",
  "MEMBER",
] as const;

function feeStatusLabel(s: SettingsMember["feeStatus"]): string {
  if (s === "em_dia") return "Em dia";
  if (s === "em_atraso") return "Em atraso";
  return "Sem plano";
}

function feeStatusClass(s: SettingsMember["feeStatus"]): string {
  if (s === "em_dia") return "text-emerald-300/95";
  if (s === "em_atraso") return "text-amber-200/95";
  return "text-slate-500";
}

function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GroupSettingsPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [statuteUrl, setStatuteUrl] = useState("");
  const [localRulesNote, setLocalRulesNote] = useState("");
  const [richPublicProfile, setRichPublicProfile] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [roleBusyUserId, setRoleBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const r = await apiJsonAuth<SettingsResponse | ApiErr>(`/groups/${groupId}/settings`);
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (r.status === 403 || r.status === 404) {
        toastFromApi(r.data as ApiErr, "Sem acesso a este grupo.");
        setBlocked(true);
        setData(null);
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Erro ao carregar configurações.");
        setBlocked(true);
        setData(null);
        return;
      }
      setBlocked(false);
      const p = r.data as SettingsResponse;
      setData(p);
      setStatuteUrl(p.group.statuteUrl ?? "");
      setLocalRulesNote(p.group.localRulesNote ?? "");
      setRichPublicProfile(p.group.richPublicProfile);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
      setBlocked(true);
      setData(null);
    }
  }, [groupId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || !data) return;
    const sec = new URLSearchParams(window.location.search).get("sec");
    if (sec !== "scouts") return;
    const t = window.setTimeout(() => {
      document.getElementById("config-scouts")?.scrollIntoView({ behavior: "smooth" });
    }, 400);
    return () => window.clearTimeout(t);
  }, [data]);

  async function saveGroupMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.viewer.canEditSettings) return;
    setSavingMeta(true);
    try {
      const body: {
        statuteUrl?: string | null;
        localRulesNote?: string | null;
        richPublicProfile?: boolean;
      } = {
        statuteUrl: statuteUrl.trim() === "" ? null : statuteUrl.trim(),
        localRulesNote: localRulesNote.trim() === "" ? null : localRulesNote.trim(),
        richPublicProfile,
      };
      const r = await apiJsonAuth<{ group: unknown } | ApiErr>(
        `/groups/${groupId}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível salvar.");
        return;
      }
      toast.success("Configurações salvas.");
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
      setSavingMeta(false);
    }
  }

  async function patchMemberRole(userId: string, role: string) {
    if (!data?.viewer.canEditSettings) return;
    setRoleBusyUserId(userId);
    try {
      const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
        `/groups/${groupId}/members/${userId}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
        },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível atualizar o papel.");
        await load();
        return;
      }
      toast.success("Papel atualizado.");
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
      setRoleBusyUserId(null);
    }
  }

  if (blocked && !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/dashboard" className="text-sm text-turf-bright hover:underline">
          ← Painel inicial
        </Link>
        <p className="mt-6 text-sm text-slate-400">
          Confira a notificação na tela para o motivo ou volte à lista de grupos.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  const { viewer, group, feePlans, members, periodMonth } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
        ← Membros do grupo
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-white">Configurações do grupo</h1>
      <p className="mt-1 text-sm text-slate-400">
        {group.name} · Situação das mensalidades referentes a {periodMonth}.
        {!viewer.canEditSettings
          ? " Apenas presidente, vice, tesoureiro ou moderador alteram estes dados."
          : ""}
      </p>

      <GroupSectionNav groupId={groupId} />

      <section className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-pitch-900/50 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Perfil público e regras</h2>
        <p className="text-xs text-slate-500">
          Com o perfil detalhado ativo e o grupo público, quem abre «Ver perfil» na busca vê
          planos de mensalidade, situação do mês (em dia / atraso) e os textos abaixo.
        </p>
        <form onSubmit={(e) => void saveGroupMeta(e)} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-400">Link do estatuto (URL)</span>
            <input
              type="url"
              value={statuteUrl}
              onChange={(e) => setStatuteUrl(e.target.value)}
              disabled={!viewer.canEditSettings}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-turf/40 disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-400">
              Regras locais / observações
            </span>
            <textarea
              value={localRulesNote}
              onChange={(e) => setLocalRulesNote(e.target.value)}
              disabled={!viewer.canEditSettings}
              rows={4}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-turf/40 disabled:opacity-60"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={richPublicProfile}
              onChange={(e) => setRichPublicProfile(e.target.checked)}
              disabled={!viewer.canEditSettings}
              className="h-4 w-4 rounded border-white/20 bg-pitch-950"
            />
            <span className="text-sm text-slate-300">
              Exibir perfil público detalhado (planos, situação do mês, estatuto e regras)
            </span>
          </label>
          {viewer.canEditSettings && (
            <button
              type="submit"
              disabled={savingMeta}
              className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
            >
              {savingMeta ? "Salvando…" : "Salvar perfil e regras"}
            </button>
          )}
        </form>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-pitch-950/40 p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          Tipos de mensalidade (planos)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Cadastro e exclusão de planos continuam na página{" "}
          <Link href={`/grupos/${groupId}/mensalidades`} className="text-turf-bright hover:underline">
            Mensalidades
          </Link>
          .
        </p>
        {feePlans.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nenhum plano cadastrado ainda.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {feePlans.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-white/10 bg-pitch-900/40 px-3 py-2 text-sm text-slate-200"
              >
                {p.name} · {formatBrlFromCents(p.amountCents)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-pitch-900/50 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Membros e papéis</h2>
        <ul className="mt-4 space-y-3">
          {members.map((m) => (
            <li
              key={m.userId}
              className="rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-white">{m.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {formatBrazilPhoneDisplay(m.phone)} · {m.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Plano:{" "}
                    {m.feePlan ? (
                      <span className="text-slate-400">
                        {m.feePlan.name} ({formatBrlFromCents(m.feePlan.amountCents)})
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </p>
                  <p className={`mt-1 text-xs font-medium ${feeStatusClass(m.feeStatus)}`}>
                    Mensalidade ({periodMonth}): {feeStatusLabel(m.feeStatus)}
                  </p>
                </div>
                <div className="shrink-0">
                  {viewer.canEditSettings ? (
                    <select
                      value={m.role}
                      disabled={roleBusyUserId !== null}
                      onChange={(e) => void patchMemberRole(m.userId, e.target.value)}
                      className="rounded-lg border border-white/15 bg-pitch-950/80 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-turf/40"
                      aria-label={`Papel de ${m.fullName}`}
                    >
                      {GROUP_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {groupMemberRoleLabel(r)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-turf-bright">
                      {groupMemberRoleLabel(m.role)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <ScoutsSettingsPanel groupId={groupId} variant="embedded" />
      </div>
    </div>
  );
}
