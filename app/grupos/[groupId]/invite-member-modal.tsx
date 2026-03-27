"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJsonAuth } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type ApiErr = { error?: string; code?: string };

export function InviteMemberModal({
  groupId,
  open,
  onClose,
  onInvited,
}: {
  groupId: string;
  open: boolean;
  onClose: () => void;
  onInvited: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [inviting, setInviting] = useState(false);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phoneTrim = phone.trim();
    const digits = phoneTrim.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Informe o celular com DDD (10 ou 11 dígitos), ex.: 11987654321.");
      return;
    }
    setInviting(true);
    try {
      const r = await apiJsonAuth<{ member?: unknown } | ApiErr>(
        `/groups/${groupId}/members/invite`,
        {
          method: "POST",
          body: JSON.stringify({ phone: phoneTrim }),
        },
      );
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível adicionar.");
        return;
      }
      toast.success("Membro adicionado ao grupo.");
      setPhone("");
      onClose();
      await onInvited();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setInviting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-member-title"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-pitch-900 p-6 shadow-xl">
        <h2 id="invite-member-title" className="font-display text-lg font-semibold text-white">
          Adicionar jogador
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          A pessoa precisa já ter conta no SportHub com esse celular (Brasil). Presidente,
          vice ou tesoureiro podem convidar.
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
          <input
            type="tel"
            required
            placeholder="11987654321"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
            >
              {inviting ? "Adicionando…" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
