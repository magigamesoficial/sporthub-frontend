"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type MeUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  birthDate: string;
  createdAt: string;
};

type ApiErr = { error?: string; code?: string };

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ContaPanel() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof window !== "undefined" && !localStorage.getItem(TOKEN_STORAGE_KEY)) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const r = await apiJsonAuth<{ user: MeUser } | ApiErr>("/auth/me");
      if (r.status === 401) {
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar sua conta.");
        setUser(null);
        return;
      }
      setUser((r.data as { user: MeUser }).user);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error("A URL da API não está configurada neste ambiente.");
      } else {
        toastNetworkError();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-slate-400">Não foi possível exibir os dados da conta.</p>
        <Link href="/login" className="mt-4 inline-block text-turf-bright hover:underline">
          Fazer login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-white">Minha conta</h1>
      <p className="mt-1 text-sm text-slate-400">Dados da sua inscrição no SportHub.</p>

      <dl className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-6">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Nome</dt>
          <dd className="mt-1 text-white">{user.fullName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">E-mail</dt>
          <dd className="mt-1 text-white">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Celular</dt>
          <dd className="mt-1 font-mono text-white">{user.phone}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Nascimento
          </dt>
          <dd className="mt-1 text-white">{formatDate(user.birthDate)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Papel</dt>
          <dd className="mt-1 text-white">
            {user.role === "ADMIN" ? "Administrador" : "Atleta"}
          </dd>
        </div>
      </dl>
      {user.role === "ADMIN" && (
        <p className="mt-6 text-sm">
          <Link href="/admin" className="font-medium text-amber-200 hover:text-amber-100 hover:underline">
            Abrir painel de administração da plataforma →
          </Link>
        </p>
      )}
    </div>
  );
}
