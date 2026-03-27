"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";
import { GroupSectionNav } from "../group-section-nav";

type LedgerKind = "INCOME" | "EXPENSE";

type LedgerRow = {
  id: string;
  kind: LedgerKind;
  amountCents: number;
  description: string;
  occurredAt: string;
  createdAt: string;
  recordedBy: { id: string; fullName: string } | null;
};

type LedgerResponse = {
  periodMonth: string;
  viewer: { canManageLedger: boolean };
  cumulative: { incomeCents: number; expenseCents: number; balanceCents: number };
  monthActivity: { incomeCents: number; expenseCents: number };
  entries: LedgerRow[];
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

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
}

function todayLocalYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const KIND_LABEL: Record<LedgerKind, string> = {
  INCOME: "Entrada",
  EXPENSE: "Saída",
};

export function CaixaPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [yearMonth, setYearMonth] = useState(currentYearMonthLocal);
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [kind, setKind] = useState<LedgerKind>("INCOME");
  const [amountReais, setAmountReais] = useState("");
  const [description, setDescription] = useState("");
  const [occurredDate, setOccurredDate] = useState(todayLocalYmd);

  const load = useCallback(async () => {
    if (typeof window !== "undefined" && !localStorage.getItem(TOKEN_STORAGE_KEY)) {
      router.replace("/login");
      return;
    }
    setData(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ month: yearMonth });
      const r = await apiJsonAuth<LedgerResponse | ApiErr>(
        `/groups/${groupId}/ledger?${q.toString()}`,
      );
      if (r.status === 401) {
        return;
      }
      if (r.status === 403 || r.status === 404) {
        toastFromApi(r.data as ApiErr, "Sem acesso a este grupo.");
        setData(null);
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar o caixa.");
        setData(null);
        return;
      }
      setData(r.data as LedgerResponse);
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

  const hintEmpty = useMemo(
    () =>
      "Nenhum lançamento neste mês. O saldo em caixa acima considera todo o histórico do grupo.",
    [],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(String(amountReais).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      toast.warning("Informe um valor maior que zero (em reais).");
      return;
    }
    const amountCents = Math.round(n * 100);
    if (amountCents <= 0) {
      toast.warning("Valor inválido.");
      return;
    }

    const datePart = occurredDate || new Date().toISOString().slice(0, 10);
    const occurredAt = new Date(`${datePart}T12:00:00.000Z`).toISOString();

    setSubmitting(true);
    try {
      const r = await apiJsonAuth<{ entry: { id: string } } | ApiErr>(
        `/groups/${groupId}/ledger`,
        {
          method: "POST",
          body: JSON.stringify({
            kind,
            amountCents,
            description: description.trim(),
            occurredAt,
          }),
        },
      );
      if (r.status === 401) return;
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível registrar o lançamento.");
        return;
      }
      toast.success("Lançamento registrado.");
      setAmountReais("");
      setDescription("");
      setOccurredDate(todayLocalYmd());
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
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
        `/groups/${groupId}/ledger/${id}`,
        { method: "DELETE" },
      );
      if (r.status === 401) return;
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível excluir.");
        return;
      }
      toast.success("Lançamento removido.");
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
      setDeletingId(null);
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
          Confira a notificação na tela ou tente novamente.
        </p>
      </div>
    );
  }

  const { cumulative, monthActivity, entries, viewer } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
        ← Membros do grupo
      </Link>
      <GroupSectionNav groupId={groupId} />

      <h1 className="mt-4 font-display text-2xl font-bold text-white">Caixa do grupo</h1>
      <p className="mt-1 text-sm text-slate-400">
        Saldo acumulado com base em todos os lançamentos. Use o mês abaixo só para filtrar a lista.
        Presidente, vice e tesoureiro lançam e excluem.
      </p>

      <div className="mt-6 rounded-2xl border border-turf/30 bg-gradient-to-br from-turf/15 to-pitch-950/80 p-6">
        <p className="text-sm font-medium text-slate-300">Saldo em caixa (acumulado)</p>
        <p className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
          {formatBrl(cumulative.balanceCents)}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Histórico: {formatBrl(cumulative.incomeCents)} em entradas ·{" "}
          {formatBrl(cumulative.expenseCents)} em saídas
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="block text-sm font-medium text-slate-300" htmlFor="ledger-month">
            Filtrar lançamentos por mês
          </label>
          <input
            id="ledger-month"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="mt-1 rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
          <p className="mt-1 text-xs capitalize text-slate-500">{formatMonthLabel(yearMonth)}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg border border-white/10 bg-pitch-950/50 px-3 py-2 text-slate-400">
            No mês:{" "}
            <span className="text-emerald-300">{formatBrl(monthActivity.incomeCents)}</span>
            {" · "}
            <span className="text-red-300/90">{formatBrl(monthActivity.expenseCents)}</span>
          </span>
        </div>
      </div>

      {viewer.canManageLedger && (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-6"
        >
          <h2 className="font-display text-lg font-semibold text-white">Novo lançamento</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-300" htmlFor="lk">
                Tipo
              </label>
              <select
                id="lk"
                value={kind}
                onChange={(e) => setKind(e.target.value as LedgerKind)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
              >
                <option value="INCOME">Entrada (receita)</option>
                <option value="EXPENSE">Saída (despesa)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300" htmlFor="lamount">
                Valor (R$)
              </label>
              <input
                id="lamount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={amountReais}
                onChange={(e) => setAmountReais(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="ldesc">
              Descrição
            </label>
            <input
              id="ldesc"
              required
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Mensalidades marcação Y, bola nova, aluguel quadra…"
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="ldate">
              Data do movimento
            </label>
            <input
              id="ldate"
              type="date"
              required
              value={occurredDate}
              onChange={(e) => setOccurredDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-turf py-3 font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
          >
            {submitting ? "Salvando…" : "Registrar"}
          </button>
        </form>
      )}

      {!viewer.canManageLedger && (
        <p className="mt-6 text-xs text-slate-500">
          Apenas presidente, vice-presidente ou tesoureiro registram ou removem lançamentos.
        </p>
      )}

      <h2 className="mt-10 font-display text-lg font-semibold text-white">
        Lançamentos em {formatMonthLabel(yearMonth)}
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{hintEmpty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {entries.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{row.description}</p>
                <p className="text-xs text-slate-500">
                  {formatWhen(row.occurredAt)}
                  {row.recordedBy && ` · por ${row.recordedBy.fullName}`}
                </p>
                <span
                  className={`mt-1 inline-block text-xs ${
                    row.kind === "INCOME" ? "text-emerald-400" : "text-red-300/90"
                  }`}
                >
                  {KIND_LABEL[row.kind]}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`font-mono text-lg font-semibold ${
                    row.kind === "INCOME" ? "text-emerald-300" : "text-red-300/90"
                  }`}
                >
                  {row.kind === "EXPENSE" ? "−" : "+"}
                  {formatBrl(row.amountCents)}
                </span>
                {viewer.canManageLedger && (
                  <button
                    type="button"
                    disabled={deletingId !== null}
                    onClick={() => void onDelete(row.id)}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingId === row.id ? "…" : "Excluir"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
