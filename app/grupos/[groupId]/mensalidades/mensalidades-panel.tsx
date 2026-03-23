"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type FeeRow = {
  userId: string;
  fullName: string;
  phone: string;
  role: string;
  paid: boolean;
  paidAt: string | null;
  recordedByName: string | null;
};

type FeesResponse = {
  periodMonth: string;
  viewer: { canManageMonthlyFees: boolean };
  rows: FeeRow[];
};

type ApiErr = { error?: string; code?: string };

function currentYearMonthLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(ym: string): string {
  const [y, mo] = ym.split("-").map(Number);
  if (!y || !mo) return ym;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(y, mo - 1, 1),
  );
}

function formatPaidAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MensalidadesPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [yearMonth, setYearMonth] = useState(currentYearMonthLocal);
  const [data, setData] = useState<FeesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const r = await apiJsonAuth<FeesResponse | ApiErr>(
        `/groups/${groupId}/fees/${yearMonth}`,
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (r.status === 403 || r.status === 404) {
        toastFromApi(r.data as ApiErr, "Sem acesso a este grupo.");
        setData(null);
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar as mensalidades.");
        setData(null);
        return;
      }
      setData(r.data as FeesResponse);
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
  }, [groupId, router, yearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    if (!data) return { paid: 0, open: 0 };
    const paid = data.rows.filter((x) => x.paid).length;
    return { paid, open: data.rows.length - paid };
  }, [data]);

  async function markPaid(userId: string) {
    setActingUserId(userId);
    try {
      const r = await apiJsonAuth<{ fee?: unknown } | ApiErr>(
        `/groups/${groupId}/fees/${yearMonth}/mark-paid`,
        { method: "POST", body: JSON.stringify({ userId }) },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível registrar o pagamento.");
        return;
      }
      toast.success("Pagamento registrado.");
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
      setActingUserId(null);
    }
  }

  async function markUnpaid(userId: string) {
    setActingUserId(userId);
    try {
      const r = await apiJsonAuth<{ ok?: boolean; removed?: number } | ApiErr>(
        `/groups/${groupId}/fees/${yearMonth}/mark-unpaid`,
        { method: "POST", body: JSON.stringify({ userId }) },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível atualizar o status.");
        return;
      }
      const body = r.data as { removed?: number };
      if (body.removed === 0) {
        toast.message("Este mês já estava em aberto para esse membro.");
      } else {
        toast.success("Marcado como em aberto.");
      }
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
      setActingUserId(null);
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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
          ← Voltar ao grupo
        </Link>
        <p className="mt-6 text-sm text-slate-400">
          Confira a notificação na tela ou tente outro grupo.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
        ← Membros do grupo
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-white">Mensalidades</h1>
      <p className="mt-1 text-sm text-slate-400">
        Acompanhamento por mês calendário. Sem registro = em aberto; registrar = marcar como pago.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="block text-sm font-medium text-slate-300" htmlFor="ym">
            Mês de referência
          </label>
          <input
            id="ym"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="mt-1 rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
          <p className="mt-1 text-xs capitalize text-slate-500">{formatMonthLabel(yearMonth)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3 text-sm text-slate-300">
          <span className="text-emerald-400">{summary.paid} em dia</span>
          <span className="mx-2 text-slate-600">·</span>
          <span className="text-amber-200/90">{summary.open} em aberto</span>
        </div>
      </div>

      {!data.viewer.canManageMonthlyFees && (
        <p className="mt-4 text-xs text-slate-500">
          Apenas presidente, vice-presidente ou tesoureiro podem registrar ou desfazer pagamentos.
        </p>
      )}

      <ul className="mt-8 space-y-3">
        {data.rows.map((row) => (
          <li
            key={row.userId}
            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{row.fullName}</p>
              <p className="text-xs text-slate-400">
                {ROLE_LABELS[row.role] ?? row.role} · {row.phone}
              </p>
              {row.paid && (
                <p className="mt-1 text-xs text-slate-500">
                  Pago em {formatPaidAt(row.paidAt)}
                  {row.recordedByName ? ` · registrado por ${row.recordedByName}` : ""}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {row.paid ? (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Pago
                </span>
              ) : (
                <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                  Em aberto
                </span>
              )}
              {data.viewer.canManageMonthlyFees && (
                <>
                  {!row.paid ? (
                    <button
                      type="button"
                      disabled={actingUserId !== null}
                      onClick={() => void markPaid(row.userId)}
                      className="rounded-lg bg-turf px-3 py-1.5 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
                    >
                      {actingUserId === row.userId ? "…" : "Marcar pago"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actingUserId !== null}
                      onClick={() => void markUnpaid(row.userId)}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
                    >
                      {actingUserId === row.userId ? "…" : "Desmarcar pago"}
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
