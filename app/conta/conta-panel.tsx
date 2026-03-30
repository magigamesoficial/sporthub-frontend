"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { BirthDateField } from "@/components/birth-date-field";
import { parseFlexibleBirthToIso } from "@/lib/brazil-date";
import { formatBrazilPhoneDisplay } from "@/lib/format-brazil";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type MeUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  createdAt: string;
};

type ApiErr = { error?: string; code?: string };

function birthToInput(iso: string): string {
  return iso.slice(0, 10);
}

export function ContaPanel() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      const u = (r.data as { user: MeUser }).user;
      setUser(u);
      setFullName(u.fullName);
      setEmail(u.email);
      setBirthDate(birthToInput(u.birthDate));
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

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const birthIso = parseFlexibleBirthToIso(birthDate);
    if (!birthIso) {
      toast.error("Informe uma data de nascimento válida (DD/MM/AAAA).");
      return;
    }
    setSavingProfile(true);
    try {
      const r = await apiJsonAuth<{ user: MeUser } | ApiErr>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          birthDate: birthIso,
        }),
      });
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível salvar os dados.");
        return;
      }
      const u = (r.data as { user: MeUser }).user;
      setUser(u);
      setBirthDate(birthToInput(u.birthDate));
      toast.success("Dados atualizados.");
    } catch {
      toastNetworkError();
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const np = newPassword.trim();
    if (np.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (np !== confirmPassword.trim()) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }
    if (!currentPassword) {
      toast.error("Informe a senha atual.");
      return;
    }
    setSavingPassword(true);
    try {
      const r = await apiJsonAuth<{ user: MeUser } | ApiErr>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword,
          newPassword: np,
        }),
      });
      if (!r.ok) {
        const err = r.data as ApiErr;
        if ((err as { code?: string }).code === "INVALID_PASSWORD") {
          toast.error("Senha atual incorreta.");
          return;
        }
        toastFromApi(err, "Não foi possível alterar a senha.");
        return;
      }
      const u = (r.data as { user: MeUser }).user;
      setUser(u);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada.");
    } catch {
      toastNetworkError();
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-lg px-4 py-10 md:px-6">
        <p className="text-slate-400">Não foi possível exibir os dados da conta.</p>
        <Link href="/login" className="mt-4 inline-block text-turf-bright hover:underline">
          Fazer login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg px-4 py-10 md:px-6">
      <h1 className="font-display text-2xl font-bold text-white">Minha conta</h1>
      <p className="mt-1 text-sm text-slate-400">Atualize seus dados ou a senha de acesso.</p>

      <form
        onSubmit={(e) => void submitProfile(e)}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-6"
      >
        <h2 className="font-display text-lg font-semibold text-white">Dados pessoais</h2>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="acc-name">
            Nome completo
          </label>
          <input
            id="acc-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="acc-email">
            E-mail
          </label>
          <input
            id="acc-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="acc-phone">
            Celular
          </label>
          <p className="mt-1 font-mono text-sm text-slate-300">{formatBrazilPhoneDisplay(user.phone)}</p>
          <p className="mt-2 text-xs text-amber-200/80">
            O celular não pode ser alterado aqui. Para mudança de número, entre em contato com o suporte da
            plataforma.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="acc-birth">
            Nascimento
          </label>
          <BirthDateField id="acc-birth" value={birthDate} onChange={setBirthDate} className="mt-1" />
        </div>
        <button
          type="submit"
          disabled={savingProfile}
          className="w-full rounded-xl bg-turf py-3 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
        >
          {savingProfile ? "Salvando…" : "Salvar dados"}
        </button>
      </form>

      <form
        onSubmit={(e) => void submitPassword(e)}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-6"
      >
        <h2 className="font-display text-lg font-semibold text-white">Alterar senha</h2>
        <p className="text-xs text-slate-500">Informe a senha atual e escolha uma nova (mín. 8 caracteres).</p>
        <div>
          <label className="block text-xs font-medium text-slate-500" htmlFor="acc-cur-pw">
            Senha atual
          </label>
          <input
            id="acc-cur-pw"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500" htmlFor="acc-new-pw">
            Nova senha
          </label>
          <input
            id="acc-new-pw"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500" htmlFor="acc-confirm-pw">
            Confirmar nova senha
          </label>
          <input
            id="acc-confirm-pw"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <button
          type="submit"
          disabled={savingPassword}
          className="w-full rounded-xl border border-white/20 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
        >
          {savingPassword ? "Alterando…" : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}
