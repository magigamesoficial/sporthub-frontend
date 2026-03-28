"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { groupMemberRoleLabel, groupVisibilityLabel, sportLabel } from "@/lib/athlete-labels";
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

  if (groups === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl px-4 py-10 md:px-6">
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="text-sm text-turf-bright hover:underline"
      >
        ← Painel inicial
      </button>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold text-white">Meus grupos</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/grupos/buscar")}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            Buscar grupos
          </button>
          <button
            type="button"
            onClick={() => router.push("/grupos/entrar")}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            Entrar por código
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-6 text-sm text-slate-400">
          <p>
            Você ainda não participa de nenhum grupo. Encontre um público ou informe o código de
            seis dígitos:
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/grupos/buscar")}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Buscar grupos
            </button>
            <button
              type="button"
              onClick={() => router.push("/grupos/entrar")}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Entrar por código
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-400">
            Você participa de <strong className="text-slate-200">{groups.length}</strong>{" "}
            {groups.length === 1 ? "grupo" : "grupos"}. Use <strong className="text-slate-200">Ver grupo</strong>{" "}
            ou o menu lateral.
          </p>
          <ul className="mt-8 space-y-3">
            {groups.map((row) => (
              <li
                key={row.group.id}
                className="rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{row.group.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {sportLabel(row.group.sport)} · código{" "}
                      <span className="font-mono text-turf-bright">{row.group.publicCode}</span> ·{" "}
                      {groupVisibilityLabel(row.group.visibility)} · papel:{" "}
                      {groupMemberRoleLabel(row.role)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/grupos/${row.group.id}`)}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 transition hover:bg-turf-bright"
                  >
                    Ver grupo
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
