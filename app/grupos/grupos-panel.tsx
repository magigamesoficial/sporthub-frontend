"use client";

import Link from "next/link";
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

      {groups.length === 0 ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-6 text-sm text-slate-400">
          Você ainda não participa de nenhum grupo. Use{" "}
          <Link href="/grupos/buscar" className="text-turf-bright hover:underline">
            Buscar grupos
          </Link>{" "}
          para encontrar um público ou{" "}
          <Link href="/grupos/entrar" className="text-turf-bright hover:underline">
            entrar por código
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-400">
            Você participa de <strong className="text-slate-200">{groups.length}</strong>{" "}
            {groups.length === 1 ? "grupo" : "grupos"}. Abra pelo nome ou pelo menu lateral.
          </p>
          <ul className="mt-8 space-y-3">
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
                  {sportLabel(row.group.sport)} · código{" "}
                  <span className="font-mono text-turf-bright">{row.group.publicCode}</span> ·{" "}
                  {groupVisibilityLabel(row.group.visibility)} · papel:{" "}
                  {groupMemberRoleLabel(row.role)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
