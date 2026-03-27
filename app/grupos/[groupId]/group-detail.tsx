"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { groupMemberRoleLabel } from "@/lib/athlete-labels";
import { formatBrazilPhoneDisplay } from "@/lib/format-brazil";
import { toast } from "sonner";

type FeePlan = { id: string; name: string; amountCents: number };

type MemberRow = {
  membershipId: string;
  userId: string;
  role: string;
  joinedAt: string;
  feePlan: FeePlan | null;
  user: { id: string; fullName: string; phone: string; email: string };
};

type MembersResponse = {
  viewer: {
    userId: string;
    role: string;
    canInviteByPhone: boolean;
    canApproveJoinRequests: boolean;
    canManageMonthlyFees: boolean;
  };
  members: MemberRow[];
};

type JoinRequestRow = {
  id: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string; phone: string };
};

type ApiErr = { error?: string; code?: string };

function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GroupDetail({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<MembersResponse | null>(null);
  const [feePlans, setFeePlans] = useState<FeePlan[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [phone, setPhone] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<JoinRequestRow[]>([]);
  const [joinActionId, setJoinActionId] = useState<string | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const r = await apiJsonAuth<MembersResponse | ApiErr>(`/groups/${groupId}/members`);
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (r.status === 403 || r.status === 404) {
        const err = r.data as ApiErr;
        toastFromApi(err, "Sem acesso a este grupo.");
        setBlocked(true);
        setData(null);
        return;
      }
      if (!r.ok) {
        const err = r.data as ApiErr;
        toastFromApi(err, "Erro ao carregar membros.");
        setBlocked(true);
        setData(null);
        return;
      }
      setBlocked(false);
      const payload = r.data as MembersResponse;
      setData(payload);

      if (payload.viewer.canManageMonthlyFees) {
        const pr = await apiJsonAuth<{ plans: FeePlan[] } | ApiErr>(
          `/groups/${groupId}/fee-plans`,
        );
        if (pr.ok) {
          setFeePlans((pr.data as { plans: FeePlan[] }).plans);
        } else {
          setFeePlans([]);
          toastFromApi(pr.data as ApiErr, "Não foi possível carregar os planos de mensalidade.");
        }
      } else {
        setFeePlans([]);
      }

      if (payload.viewer.canApproveJoinRequests) {
        const jr = await apiJsonAuth<{ requests: JoinRequestRow[] } | ApiErr>(
          `/groups/${groupId}/join-requests`,
        );
        if (jr.ok) {
          setPendingJoin((jr.data as { requests: JoinRequestRow[] }).requests);
        } else {
          setPendingJoin([]);
          toastFromApi(jr.data as ApiErr, "Não foi possível carregar solicitações de entrada.");
        }
      } else {
        setPendingJoin([]);
      }
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

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    const phoneTrim = phone.trim();
    const digits = phoneTrim.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Informe o celular com DDD (10 ou 11 dígitos), ex.: 11987654321.");
      return;
    }
    setInviting(true);
    try {
      const r = await apiJsonAuth<{ member?: unknown } | ApiErr>(
        `/groups/${groupId}/members/invite`,
        {
          method: "POST",
          body: JSON.stringify({ phone: phoneTrim }),
        },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível adicionar.");
        return;
      }
      toast.success("Membro adicionado ao grupo.");
      setPhone("");
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
      setInviting(false);
    }
  }

  async function approveRequest(requestId: string) {
    setJoinActionId(requestId);
    try {
      const r = await apiJsonAuth<unknown | ApiErr>(
        `/groups/${groupId}/join-requests/${requestId}/approve`,
        { method: "POST" },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível aprovar.");
        return;
      }
      toast.success("Entrada aprovada.");
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
      setJoinActionId(null);
    }
  }

  async function rejectRequest(requestId: string) {
    setJoinActionId(requestId);
    try {
      const r = await apiJsonAuth<unknown | ApiErr>(
        `/groups/${groupId}/join-requests/${requestId}/reject`,
        { method: "POST" },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível recusar.");
        return;
      }
      toast.success("Solicitação recusada.");
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
      setJoinActionId(null);
    }
  }

  async function assignFeePlan(targetUserId: string, feePlanId: string | null) {
    setAssigningUserId(targetUserId);
    try {
      const r = await apiJsonAuth<
        { member: { userId: string; feePlan: FeePlan | null } } | ApiErr
      >(`/groups/${groupId}/members/${targetUserId}/fee-plan`, {
        method: "PATCH",
        body: JSON.stringify({ feePlanId }),
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível atualizar o plano.");
        return;
      }
      toast.success("Plano de mensalidade atualizado.");
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
      setAssigningUserId(null);
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/grupos" className="text-sm text-turf-bright hover:underline">
        ← Lista de grupos
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Membros do grupo</h1>
      <p className="mt-1 text-sm text-slate-400">
        Seu papel:{" "}
        <span className="text-turf-bright">
          {groupMemberRoleLabel(data.viewer.role)}
        </span>
        {" · "}
        <Link
          href={`/grupos/${groupId}/mensalidades`}
          className="font-medium text-turf-bright hover:underline"
        >
          Mensalidades
        </Link>
        {" · "}
        <Link
          href={`/grupos/${groupId}/jogos`}
          className="font-medium text-turf-bright hover:underline"
        >
          Jogos
        </Link>
        {" · "}
        <Link
          href={`/grupos/${groupId}/ranking`}
          className="font-medium text-turf-bright hover:underline"
        >
          Classificação
        </Link>
        {" · "}
        <Link
          href={`/grupos/${groupId}/caixa`}
          className="font-medium text-turf-bright hover:underline"
        >
          Caixa
        </Link>
        {" · "}
        <Link
          href={`/grupos/${groupId}/scouts`}
          className="font-medium text-turf-bright hover:underline"
        >
          Scouts
        </Link>
        {" · "}
        <Link
          href={`/grupos/${groupId}/visao`}
          className="font-medium text-turf-bright/80 hover:underline"
        >
          Perfil público
        </Link>
      </p>

      {data.viewer.canApproveJoinRequests && pendingJoin.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h2 className="font-display text-lg font-semibold text-amber-100">
            Solicitações de entrada
          </h2>
          <ul className="mt-3 space-y-3">
            {pendingJoin.map((q) => (
              <li
                key={q.id}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-pitch-950/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{q.user.fullName}</p>
                  <p className="text-xs text-slate-400">
                    {formatBrazilPhoneDisplay(q.user.phone)} · {q.user.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={joinActionId !== null}
                    onClick={() => void approveRequest(q.id)}
                    className="rounded-lg bg-turf px-3 py-1.5 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
                  >
                    {joinActionId === q.id ? "…" : "Aprovar"}
                  </button>
                  <button
                    type="button"
                    disabled={joinActionId !== null}
                    onClick={() => void rejectRequest(q.id)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.viewer.canInviteByPhone && (
        <form
          onSubmit={onInvite}
          className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-pitch-900/60 p-6"
        >
          <h2 className="font-display text-lg font-semibold text-white">
            Adicionar por telefone
          </h2>
          <p className="text-xs text-slate-500">
            A pessoa precisa já ter conta no SportHub com esse celular (Brasil).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="tel"
              required
              placeholder="11987654321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            />
            <button
              type="submit"
              disabled={inviting}
              className="rounded-xl bg-turf px-4 py-2 font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
            >
              {inviting ? "Adicionando…" : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      <ul className="mt-8 space-y-2">
        {data.members.map((m) => (
          <li
            key={m.membershipId}
            className="rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3"
          >
            <p className="font-medium text-white">{m.user.fullName}</p>
            <p className="text-xs text-slate-400">
              {groupMemberRoleLabel(m.role)} · {formatBrazilPhoneDisplay(m.user.phone)} ·{" "}
              {m.user.email}
            </p>
            {m.feePlan && (
              <p className="mt-1 text-xs text-slate-500">
                Plano: {m.feePlan.name} ({formatBrlFromCents(m.feePlan.amountCents)})
              </p>
            )}
            {data.viewer.canManageMonthlyFees && feePlans.length > 0 && (
              <div className="mt-2">
                <label className="sr-only" htmlFor={`plan-${m.userId}`}>
                  Plano de mensalidade para {m.user.fullName}
                </label>
                <select
                  id={`plan-${m.userId}`}
                  disabled={assigningUserId !== null}
                  value={m.feePlan?.id ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    void assignFeePlan(m.userId, v === "" ? null : v);
                  }}
                  className="max-w-full rounded-lg border border-white/15 bg-pitch-950/80 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-turf/40"
                >
                  <option value="">Sem plano (defina antes de marcar pago)</option>
                  {feePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatBrlFromCents(p.amountCents)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {data.viewer.canManageMonthlyFees && feePlans.length === 0 && (
              <p className="mt-2 text-xs text-amber-200/80">
                Crie planos de mensalidade na página de mensalidades para atribuir valores.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
