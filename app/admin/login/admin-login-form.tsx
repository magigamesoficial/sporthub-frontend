"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiJson, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type LoginOk = {
  token: string;
  user: { id: string; fullName: string; role?: string };
};
type LoginErr = { error?: string; code?: string; reason?: string | null };

function AdminLoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = searchParams.get("session");
    if (session === "expired") {
      toast.error("Sessão expirada. Entre novamente com e-mail e senha.");
    }
    const account = searchParams.get("account");
    if (account === "banned" || account === "blocked") {
      const reason = searchParams.get("reason");
      const label =
        account === "banned"
          ? "Conta banida."
          : "Conta suspensa.";
      toast.error(reason ? `${label} Motivo: ${reason}` : label);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await apiJson<LoginOk | LoginErr>("/auth/admin-login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!r.ok) {
        const err = r.data as LoginErr;
        if (
          r.status === 403 &&
          (err.code === "ACCOUNT_BLOCKED" || err.code === "ACCOUNT_BANNED")
        ) {
          const base =
            err.code === "ACCOUNT_BANNED"
              ? "Conta banida — não é possível entrar."
              : "Conta suspensa — não é possível entrar.";
          toast.error(err.reason ? `${base} Motivo: ${err.reason}` : base);
          return;
        }
        toastFromApi(err, "Não foi possível entrar.");
        return;
      }

      const ok = r.data as LoginOk;
      if (ok.user.role !== "ADMIN") {
        toast.error("Acesso não autorizado.");
        return;
      }
      localStorage.setItem(TOKEN_STORAGE_KEY, ok.token);
      toast.success(`Bem-vindo, ${ok.user.fullName.split(" ")[0] ?? "administrador"}!`);
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-8 font-display text-xl font-bold text-white"
      >
        Sport<span className="text-turf-bright">Hub</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-pitch-900/60 p-8">
        <h1 className="font-display text-2xl font-bold text-white">Acesso administrativo</h1>
        <p className="mt-1 text-sm text-slate-400">E-mail e senha da conta administradora.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="admin-email">
              E-mail
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-amber-500/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="admin-password">
              Senha
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-amber-500/30 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-pitch-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-slate-500 hover:text-slate-300"
        >
          ← Entrada para atletas
        </Link>
      </div>
    </div>
  );
}

export function AdminLoginForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-400">
          Carregando…
        </div>
      }
    >
      <AdminLoginFormInner />
    </Suspense>
  );
}
