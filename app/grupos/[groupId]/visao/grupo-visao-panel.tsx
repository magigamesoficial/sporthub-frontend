"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { groupMemberRoleLabel, sportLabel } from "@/lib/athlete-labels";
import { whatsappUrlFromStoredPhone } from "@/lib/format-brazil";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type PublicMember = {
  userId: string;
  fullName: string;
  role: string;
  feePlanName: string | null;
  whatsappPhone: string | null;
};

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
  viewerPendingJoinRequestId: string | null;
  canRequestJoin: boolean;
  members: PublicMember[];
  memberCount: number | null;
};

type ApiErr = { error?: string; code?: string };

function WhatsAppLink({
  phone,
  label,
}: {
  phone: string;
  label: string;
}) {
  return (
    <a
      href={whatsappUrlFromStoredPhone(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-lg bg-emerald-600/25 p-2 text-emerald-400 transition hover:bg-emerald-600/35"
      aria-label={`Conversar no WhatsApp com ${label}`}
      title="WhatsApp"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    </a>
  );
}

export function GrupoVisaoPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);

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
    setJoinBusy(true);
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
      setJoinBusy(false);
    }
  }

  async function cancelJoinRequest() {
    setJoinBusy(true);
    try {
      const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
        `/groups/${groupId}/join-requests/me`,
        { method: "DELETE" },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível cancelar o pedido.");
        return;
      }
      toast.success("Pedido de entrada cancelado.");
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
      setJoinBusy(false);
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

  const { group, viewerIsMember, viewerPendingJoinRequestId, canRequestJoin, members, memberCount } =
    data;

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
        ) : viewerPendingJoinRequestId ? (
          <button
            type="button"
            disabled={joinBusy}
            onClick={() => void cancelJoinRequest()}
            className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
          >
            {joinBusy ? "…" : "Cancelar pedido"}
          </button>
        ) : canRequestJoin ? (
          <button
            type="button"
            disabled={joinBusy}
            onClick={() => void requestJoin()}
            className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
          >
            {joinBusy ? "Enviando…" : "Pedir para entrar"}
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
        {members.map((m) => {
          const showWa = Boolean(m.whatsappPhone);
          return (
            <li
              key={m.userId}
              className="rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{m.fullName}</p>
                  <p className="text-xs text-slate-500">{groupMemberRoleLabel(m.role)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Mensalidade:{" "}
                    <span className="text-slate-400">
                      {m.feePlanName ?? "não vinculada a um plano"}
                    </span>
                  </p>
                </div>
                {showWa && m.whatsappPhone ? (
                  <WhatsAppLink phone={m.whatsappPhone} label={m.fullName} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
