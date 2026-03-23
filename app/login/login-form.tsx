"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type LoginOk = { token: string; user: { id: string; fullName: string } };
type LoginErr = { error?: string; code?: string };

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await apiJson<LoginOk | LoginErr>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });

      if (!r.ok) {
        toastFromApi(r.data as LoginErr, "Não foi possível entrar.");
        return;
      }

      const ok = r.data as LoginOk;
      localStorage.setItem(TOKEN_STORAGE_KEY, ok.token);
      toast.success(`Bem-vindo, ${ok.user.fullName.split(" ")[0] ?? "de volta"}!`);
      router.replace("/grupos");
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
        <p className="mt-1 text-sm text-slate-400">Use seu celular e senha.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="phone">
              Celular
            </label>
            <input
              id="phone"
              name="phone"
              required
              autoComplete="tel"
              placeholder="11987654321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
            />
          </div>
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
