"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { groupMemberRoleLabel, sportLabel } from "@/lib/athlete-labels";
import { toast } from "sonner";

type PublicProfileResponse = {
  group: {
    id: string;
    publicCode: string;
    name: string;
    sport: string;
    visibility: string;
    presidentId: string;
    createdAt: string;
  };
  viewerIsMember: boolean;
  canRequestJoin: boolean;
  members: { userId: string; fullName: string; role: string }[];
  memberCount: number | null;
};

type ApiErr = { error?: string; code?: string };

export function GrupoVisaoPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const r = await apiJsonAuth<PublicProfileResponse | ApiErr>(
        `/groups/${groupId}/public-profile`,
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar o grupo.");
        setData(null);
        return;
      }
      setData(r.data as PublicProfileResponse);
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

  async function requestJoin() {
    if (!data) return;
    setJoining(true);
    try {
      const r = await apiJsonAuth<unknown | ApiErr>(`/groups/${groupId}/join-requests`, {
        method: "POST",
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível enviar a solicitação.");
        return;
      }
      toast.success("Solicitação enviada.");
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
      setJoining(false);
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/grupos/buscar" className="text-sm text-turf-bright hover:underline">
          ← Busca de grupos
        </Link>
        <p className="mt-6 text-slate-500">Carregando…</p>
      </div>
    );
  }

  const { group, viewerIsMember, canRequestJoin, members, memberCount } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/grupos/buscar" className="text-sm text-turf-bright hover:underline">
        ← Busca de grupos
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-white">{group.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {sportLabel(group.sport)} · Código {group.publicCode} ·{" "}
        {group.visibility === "PUBLIC" ? (
          <span className="text-emerald-300/90">Público</span>
        ) : (
          <span className="text-amber-200/90">Privado</span>
        )}
        {memberCount != null ? ` · ${memberCount} membros` : ""}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {viewerIsMember ? (
          <Link
            href={`/grupos/${groupId}`}
            className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright"
          >
            Ir ao painel do grupo
          </Link>
        ) : canRequestJoin ? (
          <button
            type="button"
            disabled={joining}
            onClick={() => void requestJoin()}
            className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
          >
            {joining ? "Enviando…" : "Pedir para entrar"}
          </button>
        ) : (
          <p className="text-sm text-slate-500">
            Grupo privado: peça um convite a um dirigente com seu telefone cadastrado.
          </p>
        )}
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-white">Membros visíveis</h2>
      <p className="mt-1 text-xs text-slate-500">
        {group.visibility === "PRIVATE" && !viewerIsMember
          ? "Somente o presidente é listado para grupos privados quando você não participa."
          : "Lista completa neste perfil público."}
      </p>
      <ul className="mt-4 space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3"
          >
            <p className="font-medium text-white">{m.fullName}</p>
            <p className="text-xs text-slate-500">{groupMemberRoleLabel(m.role)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
