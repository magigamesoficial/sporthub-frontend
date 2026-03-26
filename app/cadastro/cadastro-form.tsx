"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJson, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type LegalBlock = { version: number; title: string; content: string };

type LegalResponse = {
  terms: LegalBlock;
  privacy: LegalBlock;
};

type CaptchaResponse = { token: string; prompt: string };

type RegisterOk = { token: string; user: { id: string; fullName: string } };
type RegisterErr = { error?: string; code?: string; details?: unknown };

export function CadastroForm() {
  const router = useRouter();
  const [legal, setLegal] = useState<LegalResponse | null>(null);
  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const loadCaptcha = useCallback(async () => {
    try {
      const r = await apiJson<CaptchaResponse | RegisterErr>("/auth/captcha");
      if (!r.ok) {
        setCaptcha(null);
        toastFromApi(r.data as RegisterErr, "Não foi possível carregar o captcha.");
        return;
      }
      setCaptcha(r.data as CaptchaResponse);
      setCaptchaAnswer("");
    } catch (e) {
      setCaptcha(null);
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiJson<LegalResponse | RegisterErr>("/legal/active");
        if (cancelled) return;
        if (!r.ok) {
          const err = r.data as RegisterErr;
          toastFromApi(err, "Não foi possível carregar os termos.");
          return;
        }
        setLegal(r.data as LegalResponse);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
            toast.error(
              "A URL da API não está configurada neste ambiente. Avise o administrador.",
            );
          } else {
            toastNetworkError();
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!captcha) {
      toast.warning("Captcha indisponível. Toque em «Outro» ou atualize a página.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await apiJson<RegisterOk | RegisterErr>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          phone,
          birthDate,
          password,
          captchaToken: captcha.token,
          captchaAnswer: captchaAnswer.trim(),
          acceptTerms,
          acceptPrivacy,
        }),
      });

      if (!r.ok) {
        toastFromApi(r.data as RegisterErr, "Não foi possível criar a conta.");
        await loadCaptcha();
        return;
      }

      const ok = r.data as RegisterOk;
      localStorage.setItem(TOKEN_STORAGE_KEY, ok.token);
      toast.success(`Conta criada! Olá, ${ok.user.fullName.split(" ")[0] ?? "bem-vindo"}!`);
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
      await loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10">
      <Link
        href="/"
        className="mb-6 font-display text-xl font-bold text-white"
      >
        Sport<span className="text-turf-bright">Hub</span>
      </Link>

      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-pitch-900/60 p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white">Criar conta</h1>
        <p className="mt-1 text-sm text-slate-400">
          Preencha os dados e aceite os documentos legais para continuar.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="fullName">
              Nome completo
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
            />
          </div>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="phone">
              Celular (Brasil)
            </label>
            <input
              id="phone"
              name="phone"
              required
              autoComplete="tel"
              placeholder="11987654321 ou (11) 98765-4321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="birthDate">
              Data de nascimento
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="password">
              Senha (mín. 8 caracteres)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="passwordConfirm">
              Redigitar senha
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
            />
          </div>

          {legal && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-pitch-950/50 p-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  {legal.terms.title} (v{legal.terms.version})
                </p>
                <div className="mt-2 max-h-32 overflow-y-auto text-xs leading-relaxed text-slate-400">
                  {legal.terms.content}
                </div>
                <label className="mt-2 flex items-start gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1"
                  />
                  Li e aceito os termos de uso.
                </label>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {legal.privacy.title} (v{legal.privacy.version})
                </p>
                <div className="mt-2 max-h-32 overflow-y-auto text-xs leading-relaxed text-slate-400">
                  {legal.privacy.content}
                </div>
                <label className="mt-2 flex items-start gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    className="mt-1"
                  />
                  Li e aceito a política de privacidade.
                </label>
              </div>
            </div>
          )}

          {captcha && (
            <div>
              <p className="text-sm font-medium text-slate-300">{captcha.prompt}</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Sua resposta"
                  className="w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none ring-turf/40 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => void loadCaptcha()}
                  className="shrink-0 rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                >
                  Outro
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !legal || !captcha || !acceptTerms || !acceptPrivacy}
            className="w-full rounded-xl bg-turf py-3 font-semibold text-pitch-950 shadow-lg shadow-turf/20 transition hover:bg-turf-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-turf-bright hover:underline">
            Entrar
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
