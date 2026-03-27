"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import {
  ATHLETE_SPORT_SELECT_OPTIONS,
  groupMemberRoleLabel,
  groupVisibilityLabel,
} from "@/lib/athlete-labels";
import { toast } from "sonner";

type GroupRow = {
  role: string;
  joinedAt: string;
  group: {
    id: string;
    publicCode: string;
    name: string;
    visibility: string;
    sport: string;
    presidentId: string;
    createdAt: string;
  };
};

type ApiErr = { error?: string; code?: string };

export function GruposPanel() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("FOOTBALL");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const r = await apiJsonAuth<{ groups: GroupRow[] } | ApiErr>("/groups/mine");
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar os grupos.");
        setGroups([]);
        return;
      }
      setGroups((r.data as { groups: GroupRow[] }).groups);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
      setGroups([]);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await apiJsonAuth<
        | { group: { publicCode: string; name: string } }
        | ApiErr
      >("/groups", {
        method: "POST",
        body: JSON.stringify({ name, sport, visibility }),
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível criar o grupo.");
        return;
      }
      const created = r.data as { group: { name: string } };
      toast.success(`Grupo «${created.group.name}» criado.`);
      setName("");
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
      setCreating(false);
    }
  }

  if (groups === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-turf-bright hover:underline">
        ← Painel inicial
      </Link>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold text-white">Meus grupos</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-turf-bright">
          <Link href="/grupos/buscar" className="hover:underline">
            Buscar grupos
          </Link>
          <Link href="/grupos/entrar" className="hover:underline">
            Entrar por código
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Crie um grupo (você será o presidente) ou veja os que já participa.
      </p>

      <form
        onSubmit={onCreate}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-6"
      >
        <h2 className="font-display text-lg font-semibold text-white">Novo grupo</h2>
        <div>
          <label className="block text-sm text-slate-300" htmlFor="gname">
            Nome
          </label>
          <input
            id="gname"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-slate-300" htmlFor="gsport">
              Esporte
            </label>
            <select
              id="gsport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            >
              {ATHLETE_SPORT_SELECT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="gvis">
              Visibilidade
            </label>
            <select
              id="gvis"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
            >
              <option value="PUBLIC">Público</option>
              <option value="PRIVATE">Privado</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-xl bg-turf py-3 font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
        >
          {creating ? "Criando…" : "Criar grupo"}
        </button>
      </form>

      <ul className="mt-10 space-y-3">
        {groups.length === 0 && (
          <li className="text-sm text-slate-500">Você ainda não participa de nenhum grupo.</li>
        )}
        {groups.map((row) => (
          <li
            key={row.group.id}
            className="rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3"
          >
            <Link
              href={`/grupos/${row.group.id}`}
              className="font-medium text-white hover:text-turf-bright"
            >
              {row.group.name}
            </Link>
            <p className="mt-1 text-xs text-slate-400">
              Código: <span className="font-mono text-turf-bright">{row.group.publicCode}</span> ·{" "}
              {groupVisibilityLabel(row.group.visibility)} · Papel:{" "}
              {groupMemberRoleLabel(row.role)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
