"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import {
  DOMINANT_SIDE_SELECT_OPTIONS,
  sportLabel,
} from "@/lib/athlete-labels";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";
import { GroupSectionNav } from "../group-section-nav";

type PositionOption = { value: string; label: string };

type SettingsPayload = {
  nickname: string | null;
  dominantFoot: string | null;
  dominantHand: string | null;
  shirtSize: string | null;
  shortsSize: string | null;
  shoeSize: string | null;
  positionKey: string | null;
};

type LoadResponse = {
  group: { id: string; name: string; sport: string };
  positions: PositionOption[];
  settings: SettingsPayload;
};

type ApiErr = { error?: string; code?: string };

const CLOTHING_SIZE_HINTS = ["PP", "P", "M", "G", "GG", "XG", "XXG"];

export function PerfilPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [sport, setSport] = useState("");
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [nickname, setNickname] = useState("");
  const [dominantFoot, setDominantFoot] = useState("");
  const [dominantHand, setDominantHand] = useState("");
  const [shirtSize, setShirtSize] = useState("");
  const [shortsSize, setShortsSize] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [positionKey, setPositionKey] = useState("");

  const applySettings = useCallback((s: SettingsPayload) => {
    setNickname(s.nickname ?? "");
    setDominantFoot(s.dominantFoot ?? "");
    setDominantHand(s.dominantHand ?? "");
    setShirtSize(s.shirtSize ?? "");
    setShortsSize(s.shortsSize ?? "");
    setShoeSize(s.shoeSize ?? "");
    setPositionKey(s.positionKey ?? "");
  }, []);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const r = await apiJsonAuth<LoadResponse | ApiErr>(
        `/groups/${groupId}/my-athlete-settings`,
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (r.status === 403 || r.status === 404) {
        toastFromApi(r.data as ApiErr, "Sem acesso a este grupo.");
        router.push("/grupos");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar seus dados.");
        return;
      }
      const data = r.data as LoadResponse;
      setGroupName(data.group.name);
      setSport(data.group.sport);
      setPositions(data.positions);
      applySettings(data.settings);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setLoading(false);
    }
  }, [applySettings, groupId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        nickname: nickname.trim(),
        dominantFoot:
          dominantFoot === "" ? null : (dominantFoot as "LEFT" | "RIGHT" | "BOTH"),
        dominantHand:
          dominantHand === "" ? null : (dominantHand as "LEFT" | "RIGHT" | "BOTH"),
        shirtSize: shirtSize.trim(),
        shortsSize: shortsSize.trim(),
        shoeSize: shoeSize.trim(),
        positionKey: positionKey.trim(),
      };
      const r = await apiJsonAuth<{ settings: SettingsPayload } | ApiErr>(
        `/groups/${groupId}/my-athlete-settings`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível salvar.");
        return;
      }
      toast.success("Perfil atualizado neste grupo.");
      applySettings((r.data as { settings: SettingsPayload }).settings);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl px-4 py-10 md:px-6">
      <Link href={`/grupos/${groupId}/jogos`} className="text-sm text-turf-bright hover:underline">
        ← Eventos do grupo
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-white">Perfil</h1>
      <p className="mt-1 text-sm text-slate-400">
        <span className="text-slate-200">{groupName}</span> · {sportLabel(sport)}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Estas informações são só deste grupo: uniformes, material e posição para o esporte do grupo.
      </p>

      <GroupSectionNav groupId={groupId} />

      <form
        onSubmit={(e) => void onSave(e)}
        className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-pitch-900/60 p-6"
      >
        <div>
          <label className="block text-sm text-slate-300" htmlFor="nick">
            Apelido
          </label>
          <input
            id="nick"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={80}
            placeholder="Como quer ser chamado neste grupo"
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-turf/40"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-slate-300" htmlFor="foot">
              Pé predominante
            </label>
            <select
              id="foot"
              value={dominantFoot}
              onChange={(e) => setDominantFoot(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            >
              {DOMINANT_SIDE_SELECT_OPTIONS.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="hand">
              Mão predominante
            </label>
            <select
              id="hand"
              value={dominantHand}
              onChange={(e) => setDominantHand(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            >
              {DOMINANT_SIDE_SELECT_OPTIONS.map((o) => (
                <option key={`h-${o.value || "empty"}`} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-slate-300" htmlFor="shirt">
              Tamanho da camiseta
            </label>
            <input
              id="shirt"
              value={shirtSize}
              onChange={(e) => setShirtSize(e.target.value)}
              maxLength={20}
              list="hints-shirt"
              placeholder="ex.: M, G, GG"
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-turf/40"
            />
            <datalist id="hints-shirt">
              {CLOTHING_SIZE_HINTS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="shorts">
              Tamanho da bermuda
            </label>
            <input
              id="shorts"
              value={shortsSize}
              onChange={(e) => setShortsSize(e.target.value)}
              maxLength={20}
              list="hints-shorts"
              placeholder="ex.: M, G, 42"
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-turf/40"
            />
            <datalist id="hints-shorts">
              {CLOTHING_SIZE_HINTS.map((s) => (
                <option key={`b-${s}`} value={s} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300" htmlFor="shoe">
            Número do calçado
          </label>
          <input
            id="shoe"
            value={shoeSize}
            onChange={(e) => setShoeSize(e.target.value)}
            maxLength={20}
            placeholder="ex.: 42, 38 BR"
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-turf/40"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300" htmlFor="pos">
            Posição que joga ({sportLabel(sport)})
          </label>
          <select
            id="pos"
            value={positionKey}
            onChange={(e) => setPositionKey(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          >
            <option value="">— Selecione —</option>
            {positions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-turf py-3 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
