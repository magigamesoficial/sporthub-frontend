"use client";

import { useState } from "react";
import { apiJsonAuth } from "@/lib/api";
import {
  ATHLETE_SPORT_SELECT_OPTIONS,
  groupVisibilityLabel,
} from "@/lib/athlete-labels";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type ApiErr = { error?: string; code?: string };

export function CreateGroupModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState("FOOTBALL");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await apiJsonAuth<{ group: { publicCode: string; name: string } } | ApiErr>(
        "/groups",
        {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), sport, visibility }),
        },
      );
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível criar o grupo.");
        return;
      }
      const created = r.data as { group: { name: string } };
      toast.success(`Grupo «${created.group.name}» criado.`);
      setName("");
      window.dispatchEvent(new CustomEvent("sporthub:my-groups-changed"));
      onCreated?.();
      onClose();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error("A URL da API não está configurada neste ambiente.");
      } else {
        toastNetworkError();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-pitch-950 p-6 shadow-xl">
        <h2 className="font-display text-xl font-bold text-white">Criar grupo</h2>
        <p className="mt-1 text-xs text-slate-500">
          Você será o presidente. O grupo aparecerá em «Meus grupos».
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm text-slate-300" htmlFor="cg-name">
              Nome do grupo
            </label>
            <input
              id="cg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="cg-sport">
              Esporte
            </label>
            <select
              id="cg-sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            >
              {ATHLETE_SPORT_SELECT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="cg-vis">
              Visibilidade
            </label>
            <select
              id="cg-vis"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            >
              <option value="PUBLIC">{groupVisibilityLabel("PUBLIC")}</option>
              <option value="PRIVATE">{groupVisibilityLabel("PRIVATE")}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-turf px-5 py-2.5 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
            >
              {creating ? "Criando…" : "Criar grupo"}
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={onClose}
              className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
