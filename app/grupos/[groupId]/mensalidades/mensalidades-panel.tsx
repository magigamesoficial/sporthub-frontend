"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { groupMemberRoleLabel } from "@/lib/athlete-labels";
import { formatBrazilPhoneDisplay } from "@/lib/format-brazil";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";
import { GroupSectionNav } from "../group-section-nav";

type FeePlan = { id: string; name: string; amountCents: number };

type MonthCellState = { applicable: boolean; paid: boolean; paidAt: string | null };

type YearRow = {
  userId: string;
  fullName: string;
  phone: string;
  role: string;
  feePlan: FeePlan | null;
  joinYm: string;
  months: Record<string, MonthCellState>;
};

type YearSummaryResponse = {
  year: number;
  todayYearMonth: string;
  viewer: { canManageMonthlyFees: boolean };
  rows: YearRow[];
};

type ApiErr = { error?: string; code?: string };

function formatMonthLabel(ym: string): string {
  const [y, mo] = ym.split("-").map(Number);
  if (!y || !mo) return ym;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(y, mo - 1, 1),
  );
}

function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthKeysForYear(year: number): string[] {
  return Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
  );
}

function monthShortHeaders(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(year, i, 1)),
  );
}

export function MensalidadesPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const defaultYear = new Date().getFullYear();
  const [year, setYear] = useState(defaultYear);
  const [data, setData] = useState<YearSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingKey, setActingKey] = useState<string | null>(null);

  const ymList = useMemo(() => monthKeysForYear(year), [year]);
  const monthLabels = useMemo(() => monthShortHeaders(year), [year]);

  const yearOptions = useMemo(() => {
    const y0 = defaultYear;
    const list: number[] = [];
    for (let y = y0 - 5; y <= y0 + 1; y += 1) list.push(y);
    return list;
  }, [defaultYear]);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const r = await apiJsonAuth<YearSummaryResponse | ApiErr>(
        `/groups/${groupId}/fees/year/${year}`,
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
      setData(r.data as YearSummaryResponse);
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
  }, [groupId, router, year]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markPaid(userId: string, viewedYm: string) {
    const key = `${userId}|${viewedYm}|pay`;
    setActingKey(key);
    try {
      const r = await apiJsonAuth<
        | { fee?: { periodMonth: string }; appliedPeriodMonth?: string }
        | ApiErr
      >(`/groups/${groupId}/fees/${viewedYm}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível registrar o pagamento.");
        return;
      }
      const body = r.data as { appliedPeriodMonth?: string; fee?: { periodMonth: string } };
      const applied = body.appliedPeriodMonth ?? body.fee?.periodMonth;
      toast.success(
        applied
          ? `Baixado ${formatMonthLabel(applied)} (sempre o mês mais antigo em aberto até o mês clicado).`
          : "Pagamento registrado.",
      );
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
      setActingKey(null);
    }
  }

  async function markUnpaid(userId: string, periodYm: string) {
    const key = `${userId}|${periodYm}|unpay`;
    setActingKey(key);
    try {
      const r = await apiJsonAuth<{ ok?: boolean; removed?: number } | ApiErr>(
        `/groups/${groupId}/fees/${periodYm}/mark-unpaid`,
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
        toast.success("Pagamento removido neste mês.");
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
      setActingKey(null);
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
      <div className="w-full max-w-6xl px-4 py-10 md:px-6">
        <Link href={`/grupos/${groupId}/jogos`} className="text-sm text-turf-bright hover:underline">
          ← Jogos
        </Link>
        <p className="mt-6 text-sm text-slate-400">
          Confira a notificação na tela ou tente outro grupo.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[100rem] px-4 py-10 md:px-6">
      <Link href={`/grupos/${groupId}/membros`} className="text-sm text-turf-bright hover:underline">
        ← Membros
      </Link>
      <GroupSectionNav groupId={groupId} />

      <h1 className="mt-4 font-display text-2xl font-bold text-white">Mensalidades</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-400">
        Cadastre planos em{" "}
        <Link href={`/grupos/${groupId}/configuracao`} className="text-turf-bright hover:underline">
          Configurações
        </Link>{" "}
        e atribua cada membro em{" "}
        <Link href={`/grupos/${groupId}/membros`} className="text-turf-bright hover:underline">
          Membros
        </Link>
        . Na grade, clique em um mês em aberto para registrar pagamento: o sistema{" "}
        <strong className="text-slate-300">sempre quita o mês mais antigo em aberto</strong> até o
        mês da coluna (regra de fila). Em um mês pago, clique para desmarcar só esse mês.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300" htmlFor="fee-year">
            Ano
          </label>
          <select
            id="fee-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Mês corrente (servidor): <span className="text-slate-400">{data.todayYearMonth}</span>
        </p>
      </div>

      {!data.viewer.canManageMonthlyFees && (
        <p className="mt-4 text-xs text-slate-500">
          Apenas presidente, vice-presidente ou tesoureiro alteram pagamentos.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-pitch-950/40">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <th className="sticky left-0 z-10 bg-pitch-950/95 px-3 py-3 font-semibold backdrop-blur-sm">
                Membro
              </th>
              <th className="whitespace-nowrap px-2 py-3 font-semibold">Plano</th>
              {ymList.map((ym, idx) => (
                <th
                  key={ym}
                  className="w-10 min-w-[2.5rem] px-1 py-3 text-center font-semibold capitalize text-slate-400"
                  title={formatMonthLabel(ym)}
                >
                  {monthLabels[idx].replace(".", "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.userId} className="border-b border-white/5 last:border-0">
                <td className="sticky left-0 z-10 bg-pitch-950/90 px-3 py-2 align-top backdrop-blur-sm">
                  <p className="font-medium text-white">{row.fullName}</p>
                  <p className="text-[11px] text-slate-500">
                    {groupMemberRoleLabel(row.role)} · {formatBrazilPhoneDisplay(row.phone)}
                  </p>
                </td>
                <td className="max-w-[8rem] px-2 py-2 align-top text-xs text-slate-400">
                  {row.feePlan ? (
                    <>
                      {row.feePlan.name}
                      <span className="mt-0.5 block text-slate-500">
                        {formatBrlFromCents(row.feePlan.amountCents)}
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-200/70">Sem plano</span>
                  )}
                </td>
                {ymList.map((ym) => {
                  const cell = row.months[ym];
                  const busyPay = actingKey === `${row.userId}|${ym}|pay`;
                  const busyUnpay = actingKey === `${row.userId}|${ym}|unpay`;
                  const busy = busyPay || busyUnpay;

                  if (!cell?.applicable) {
                    return (
                      <td key={ym} className="p-1 align-middle text-center">
                        <span
                          className="mx-auto block h-8 w-8 rounded-md bg-white/5 text-center text-xs leading-8 text-slate-600"
                          title="Sem mensalidade neste mês"
                        >
                          —
                        </span>
                      </td>
                    );
                  }

                  if (cell.paid) {
                    return (
                      <td key={ym} className="p-1 align-middle text-center">
                        <button
                          type="button"
                          title={`Pago · clique para desmarcar (${formatMonthLabel(ym)})`}
                          disabled={!data.viewer.canManageMonthlyFees || busy}
                          onClick={() => void markUnpaid(row.userId, ym)}
                          className="h-8 w-full min-w-[2rem] rounded-md border border-emerald-500/45 bg-emerald-500/20 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyUnpay ? "…" : "✓"}
                        </button>
                      </td>
                    );
                  }

                  return (
                    <td key={ym} className="p-1 align-middle text-center">
                      <button
                        type="button"
                        title={`Marcar pago (quita o mais antigo em aberto até ${formatMonthLabel(ym)})`}
                        disabled={
                          !data.viewer.canManageMonthlyFees || !row.feePlan || busy
                        }
                        onClick={() => void markPaid(row.userId, ym)}
                        className="h-8 w-full min-w-[2rem] rounded-md border border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-100/90 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busyPay ? "…" : "·"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
