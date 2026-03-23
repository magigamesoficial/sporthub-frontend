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

type MemberRow = {
  membershipId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; fullName: string; phone: string; email: string };
};

type MembersResponse = {
  viewer: {
    userId: string;
    role: string;
    canInviteByPhone: boolean;
    canApproveJoinRequests: boolean;
  };
  members: MemberRow[];
};

type JoinRequestRow = {
  id: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string; phone: string };
};

type ApiErr = { error?: string; code?: string };

export function GroupDetail({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<MembersResponse | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [phone, setPhone] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<JoinRequestRow[]>([]);
  const [joinActionId, setJoinActionId] = useState<string | null>(null);

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
    setInviting(true);
    try {
      const r = await apiJsonAuth<{ member?: unknown } | ApiErr>(
        `/groups/${groupId}/members/invite`,
        {
          method: "POST",
          body: JSON.stringify({ phone }),
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

  if (blocked && !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/grupos" className="text-sm text-turf-bright hover:underline">
          ← Meus grupos
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
        ← Meus grupos
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Membros do grupo</h1>
      <p className="mt-1 text-sm text-slate-400">
        Seu papel:{" "}
        <span className="text-turf-bright">
          {ROLE_LABELS[data.viewer.role] ?? data.viewer.role}
        </span>
        {" · "}
        <Link
          href={`/grupos/${groupId}/mensalidades`}
          className="font-medium text-turf-bright hover:underline"
        >
          Mensalidades
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
                    {q.user.phone} · {q.user.email}
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
              {ROLE_LABELS[m.role] ?? m.role} · {m.user.phone} · {m.user.email}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
