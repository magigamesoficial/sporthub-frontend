"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type ScoutSettingsResponse = {
  viewer: { canConfigure: boolean };
  sport: string;
  coreStats: { key: string; label: string }[];
  optionalMetrics: {
    id: string;
    key: string;
    label: string;
    sortOrder: number;
    isActive?: boolean;
    enabled: boolean;
  }[];
};

type ApiErr = { error?: string; code?: string };

export function ScoutsSettingsPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ScoutSettingsResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const r = await apiJsonAuth<ScoutSettingsResponse | ApiErr>(
        `/groups/${groupId}/scout-settings`,
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Sem acesso a esta configuração.");
        setData(null);
        return;
      }
      const payload = r.data as ScoutSettingsResponse;
      setData(payload);
      const en = new Set<string>();
      for (const m of payload.optionalMetrics) {
        if (m.enabled) en.add(m.id);
      }
      setSelected(en);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
      setData(null);
    }
  }, [groupId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedOptional = useMemo(
    () => (data ? [...data.optionalMetrics].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [data],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!data?.viewer.canConfigure) return;
    setSaving(true);
    try {
      const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
        `/groups/${groupId}/scout-settings`,
        {
          method: "PUT",
          body: JSON.stringify({ enabledMetricDefinitionIds: Array.from(selected) }),
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
      toast.success("Scouts atualizados.");
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
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
          ← Grupo
        </Link>
        <p className="mt-6 text-slate-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
        ← Membros do grupo
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Scouts do grupo</h1>
      <p className="mt-2 text-sm text-slate-400">
        Estatísticas de ranking (jogos, vitórias, empates, derrotas, pontos e aproveitamento) vêm
        automaticamente do resultado do jogo e da sua presença como &quot;Vou&quot;. Abaixo você
        escolhe métricas extras cadastradas pelo administrador da plataforma para este esporte.
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-pitch-950/50 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Sempre no ranking</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-400">
          {data.coreStats.map((c) => (
            <li key={c.key}>{c.label}</li>
          ))}
        </ul>
      </div>

      <div className="mt-8 rounded-2xl border border-turf/25 bg-turf/5 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Métricas opcionais</h2>
        {sortedOptional.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Nenhuma métrica extra cadastrada para este esporte no painel administrativo da
            plataforma.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedOptional.map((m) => (
              <li key={m.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`scout-${m.id}`}
                  checked={selected.has(m.id)}
                  disabled={!data.viewer.canConfigure}
                  onChange={() => toggle(m.id)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-pitch-950"
                />
                <label htmlFor={`scout-${m.id}`} className="text-sm text-slate-300">
                  <span className="font-medium text-white">{m.label}</span>
                  <span className="ml-2 text-xs text-slate-600">({m.key})</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {data.viewer.canConfigure && sortedOptional.length > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="mt-6 rounded-xl bg-turf px-6 py-2.5 font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar seleção"}
          </button>
        )}

        {!data.viewer.canConfigure && (
          <p className="mt-4 text-xs text-slate-500">
            Apenas presidente, vice, tesoureiro ou moderador alteram esta lista.
          </p>
        )}
      </div>
    </div>
  );
}
