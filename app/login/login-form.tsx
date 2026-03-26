"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type LoginOk = {
  token: string;
  user: { id: string; fullName: string; role?: string };
};
type LoginErr = { error?: string; code?: string; reason?: string | null };

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"athlete" | "admin">("athlete");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = searchParams.get("session");
    if (session === "expired") {
      toast.error("Sessão expirada ou inválida. Entre novamente.");
      return;
    }
    const account = searchParams.get("account");
    if (account === "banned" || account === "blocked") {
      const reason = searchParams.get("reason");
      const label =
        account === "banned"
          ? "Esta conta foi banida e não pode acessar a plataforma."
          : "Esta conta está suspensa e não pode acessar a plataforma.";
      toast.error(reason ? `${label} Motivo informado: ${reason}` : label);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const path = mode === "admin" ? "/auth/admin-login" : "/auth/login";
      const body =
        mode === "admin"
          ? JSON.stringify({ email: email.trim(), password })
          : JSON.stringify({ phone, password });

      const r = await apiJson<LoginOk | LoginErr>(path, {
        method: "POST",
        body,
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
        if (err.code === "ADMIN_EMAIL_LOGIN_REQUIRED") {
          toast.error(err.error ?? "Use o login de administrador com e-mail.");
          setMode("admin");
          return;
        }
        toastFromApi(err, "Não foi possível entrar.");
        return;
      }

      const ok = r.data as LoginOk;
      localStorage.setItem(TOKEN_STORAGE_KEY, ok.token);
      toast.success(`Bem-vindo, ${ok.user.fullName.split(" ")[0] ?? "de volta"}!`);
      if (ok.user.role === "ADMIN") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
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

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-pitch-900/60 p-8">
        <h1 className="font-display text-2xl font-bold text-white">Entrar</h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === "admin"
            ? "Administrador: e-mail e senha da plataforma."
            : "Atletas: celular e senha."}
        </p>

        <div className="mt-4 flex rounded-lg border border-white/10 p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setMode("athlete")}
            className={`flex-1 rounded-md py-2 font-medium transition ${
              mode === "athlete"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Atleta
          </button>
          <button
            type="button"
            onClick={() => setMode("admin")}
            className={`flex-1 rounded-md py-2 font-medium transition ${
              mode === "admin"
                ? "bg-amber-500/20 text-amber-100"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Administrador
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "athlete" ? (
            <div>
              <label className="block text-sm font-medium text-slate-300" htmlFor="phone">
                Celular
              </label>
              <input
                id="phone"
                name="phone"
                required
                autoComplete="tel"
                placeholder="47988169663"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-300" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-turf py-3 font-semibold text-pitch-950 shadow-lg shadow-turf/20 transition hover:bg-turf-bright disabled:opacity-50"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Novo por aqui?{" "}
          <Link href="/cadastro" className="font-medium text-turf-bright hover:underline">
            Criar conta
          </Link>
        </p>
        <Link
          href="/"
          className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-300"
        >
          ← Voltar à página inicial
        </Link>
      </div>
    </div>
  );
}
