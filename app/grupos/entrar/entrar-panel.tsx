"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { sportLabel } from "@/lib/athlete-labels";
import { toast } from "sonner";

type PreviewOk = {
  group: {
    id: string;
    publicCode: string;
    name: string;
    sport: string;
    visibility: string;
  };
  isMember: boolean;
  hasPendingRequest: boolean;
  canRequestJoin: boolean;
};

type ApiErr = { error?: string; code?: string };

export function EntrarPanel() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<PreviewOk | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [joining, setJoining] = useState(false);

  async function onPreview(e: React.FormEvent) {
    e.preventDefault();
    setPreview(null);
    const digits = code.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) {
      toast.warning("Informe os 6 dígitos do código do grupo.");
      return;
    }
    if (typeof window !== "undefined" && !localStorage.getItem(TOKEN_STORAGE_KEY)) {
      router.replace("/login");
      return;
    }
    setLoadingPreview(true);
    try {
      const r = await apiJsonAuth<PreviewOk | ApiErr>(`/groups/preview-code/${digits}`);
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar o grupo.");
        return;
      }
      setPreview(r.data as PreviewOk);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setLoadingPreview(false);
    }
  }

  async function onJoin() {
    if (!preview) return;
    setJoining(true);
    try {
      const r = await apiJsonAuth<{ request?: unknown } | ApiErr>("/groups/join-by-code", {
        method: "POST",
        body: JSON.stringify({ publicCode: preview.group.publicCode }),
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível solicitar entrada.");
        return;
      }
      toast.success("Solicitação enviada! Aguarde a aprovação de um líder.");
      router.push(`/grupos/${preview.group.id}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="w-full max-w-lg px-4 py-10 md:px-6">
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="text-sm text-turf-bright hover:underline"
      >
        ← Painel inicial
      </button>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">
        Entrar em grupo público
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Digite o código de 6 números do grupo. Grupos privados só entram por convite.
      </p>

      <form onSubmit={onPreview} className="mt-6 flex gap-2">
        <input
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="flex-1 rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 font-mono text-white outline-none focus:ring-2 focus:ring-turf/40"
        />
        <button
          type="submit"
          disabled={loadingPreview}
          className="rounded-xl bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 disabled:opacity-50"
        >
          {loadingPreview ? "…" : "Buscar"}
        </button>
      </form>

      {preview && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-pitch-900/60 p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            {preview.group.name}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {sportLabel(preview.group.sport)} · Código{" "}
            <span className="font-mono text-turf-bright">{preview.group.publicCode}</span>
          </p>
          {preview.isMember && (
            <p className="mt-4 text-sm text-turf-bright">Você já é membro deste grupo.</p>
          )}
          {!preview.isMember && preview.hasPendingRequest && (
            <p className="mt-4 text-sm text-amber-200">
              Solicitação enviada — aguarde aprovação de um líder do grupo.
            </p>
          )}
          {!preview.isMember && preview.canRequestJoin && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void onJoin()}
                disabled={joining}
                className="w-full rounded-xl bg-turf py-3 font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
              >
                {joining ? "Enviando…" : "Solicitar entrada"}
              </button>
            </div>
          )}
          {preview.isMember && (
            <button
              type="button"
              onClick={() => router.push(`/grupos/${preview.group.id}`)}
              className="mt-4 inline-flex rounded-lg border border-turf/40 bg-turf/10 px-4 py-2 text-sm font-semibold text-turf-bright hover:bg-turf/20"
            >
              Abrir página do grupo →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
