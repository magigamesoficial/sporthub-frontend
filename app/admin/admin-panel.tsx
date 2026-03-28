"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayoutShell, type AdminTab } from "@/components/admin-layout-shell";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { formatBrazilPhoneDisplay } from "@/lib/format-brazil";
import { MODAL_OVERLAY_CLASS, MODAL_PANEL_SCROLL_CLASS } from "@/lib/modal-layout";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

const SPORTS: { value: string; label: string }[] = [
  { value: "FOOTBALL", label: "Futebol" },
  { value: "VOLLEYBALL", label: "Vôlei" },
  { value: "BEACH_TENNIS", label: "Beach tennis" },
  { value: "PADEL", label: "Padel" },
  { value: "FUTVOLEI", label: "Futvôlei" },
  { value: "BASKETBALL", label: "Basquete" },
];

function sportLabel(value: string): string {
  return SPORTS.find((s) => s.value === value)?.label ?? value;
}

function roleLabel(role: string): string {
  if (role === "ADMIN") return "Administrador";
  if (role === "ATHLETE") return "Atleta";
  return role;
}

function accountStatusLabel(s: string): string {
  if (s === "ACTIVE") return "Ativa";
  if (s === "BLOCKED") return "Suspensa";
  if (s === "BANNED") return "Banida";
  return s;
}

function visibilityLabel(v: string): string {
  if (v === "PUBLIC") return "Público";
  if (v === "PRIVATE") return "Privado";
  return v;
}

function legalSlugLabel(slug: string): string {
  if (slug === "terms") return "Termos de uso";
  if (slug === "privacy") return "Política de privacidade";
  return slug;
}

function formatDateTimePt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function birthDateToInput(iso: string): string {
  return iso.slice(0, 10);
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(local: string): string {
  return new Date(local).toISOString();
}

type ApiErr = { error?: string; code?: string; details?: unknown };

type MeUser = { id: string; role: string; fullName: string };

type AdminUserRow = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  birthDate: string;
  role: string;
  accountStatus: string;
  moderationReason: string | null;
  moderatedAt: string | null;
  termsVersion: number;
  privacyVersion: number;
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  createdAt: string;
  updatedAt: string;
};

type EditUserFormState = {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  role: string;
  accountStatus: string;
  moderationReason: string;
  moderatedAtLocal: string;
  termsVersion: string;
  privacyVersion: string;
  termsAcceptedAtLocal: string;
  privacyAcceptedAtLocal: string;
  newPassword: string;
};

type AdminGroupRow = {
  id: string;
  name: string;
  publicCode: string;
  visibility: string;
  sport: string;
  createdAt: string;
  president: { id: string; fullName: string; email: string; phone: string };
  _count: { members: number };
};

type ScoutMetricRow = {
  id: string;
  sport: string;
  key: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type LegalDocRow = {
  id: string;
  slug: string;
  version: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
};

export function AdminPanel() {
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null | undefined>(undefined);
  const [tab, setTab] = useState<AdminTab>("users");

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [groups, setGroups] = useState<AdminGroupRow[]>([]);
  const [metrics, setMetrics] = useState<ScoutMetricRow[]>([]);
  const [legalDocs, setLegalDocs] = useState<LegalDocRow[]>([]);

  const [loadUsers, setLoadUsers] = useState(false);
  const [loadGroups, setLoadGroups] = useState(false);
  const [loadSports, setLoadSports] = useState(false);
  const [loadLegal, setLoadLegal] = useState(false);

  const [moderateUserId, setModerateUserId] = useState<string | null>(null);
  const [moderateKind, setModerateKind] = useState<"BLOCKED" | "BANNED" | null>(null);
  const [moderateReason, setModerateReason] = useState("");

  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState<EditUserFormState | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [scoutSport, setScoutSport] = useState("FOOTBALL");
  const [newScoutKey, setNewScoutKey] = useState("");
  const [newScoutLabel, setNewScoutLabel] = useState("");
  const [newScoutOrder, setNewScoutOrder] = useState("0");

  const [legalSlug, setLegalSlug] = useState<"terms" | "privacy">("terms");
  const [legalTitle, setLegalTitle] = useState("");
  const [legalContent, setLegalContent] = useState("");
  const [legalSetActive, setLegalSetActive] = useState(true);

  const metricsBySport = useMemo(() => {
    const m = new Map<string, ScoutMetricRow[]>();
    for (const row of metrics) {
      if (!m.has(row.sport)) m.set(row.sport, []);
      m.get(row.sport)!.push(row);
    }
    return m;
  }, [metrics]);

  const checkAuth = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    const r = await apiJsonAuth<{ user: MeUser } | ApiErr>("/auth/me");
    if (!r.ok || !("user" in r.data)) {
      setMe(null);
      return;
    }
    const u = (r.data as { user: MeUser }).user;
    if (u.role !== "ADMIN") {
      toast.error("Acesso restrito a administradores.");
      router.replace("/dashboard");
      return;
    }
    setMe(u);
  }, [router]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const fetchUsers = useCallback(async () => {
    setLoadUsers(true);
    try {
      const r = await apiJsonAuth<{ users: AdminUserRow[] } | ApiErr>("/admin/users");
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível listar contas.");
        return;
      }
      setUsers((r.data as { users: AdminUserRow[] }).users);
    } catch {
      toastNetworkError();
    } finally {
      setLoadUsers(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoadGroups(true);
    try {
      const r = await apiJsonAuth<{ groups: AdminGroupRow[] } | ApiErr>("/admin/groups");
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível listar grupos.");
        return;
      }
      setGroups((r.data as { groups: AdminGroupRow[] }).groups);
    } catch {
      toastNetworkError();
    } finally {
      setLoadGroups(false);
    }
  }, []);

  const fetchScouts = useCallback(async () => {
    setLoadSports(true);
    try {
      const r = await apiJsonAuth<{ metrics: ScoutMetricRow[] } | ApiErr>(
        "/admin/scout-metrics",
      );
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível listar métricas.");
        return;
      }
      setMetrics((r.data as { metrics: ScoutMetricRow[] }).metrics);
    } catch {
      toastNetworkError();
    } finally {
      setLoadSports(false);
    }
  }, []);

  const fetchLegal = useCallback(async () => {
    setLoadLegal(true);
    try {
      const r = await apiJsonAuth<{ documents: LegalDocRow[] } | ApiErr>("/admin/legal-documents");
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível listar documentos.");
        return;
      }
      setLegalDocs((r.data as { documents: LegalDocRow[] }).documents);
    } catch {
      toastNetworkError();
    } finally {
      setLoadLegal(false);
    }
  }, []);

  useEffect(() => {
    if (me === undefined || !me) return;
    if (tab === "users") void fetchUsers();
    if (tab === "groups") void fetchGroups();
    if (tab === "sports") void fetchScouts();
    if (tab === "legal") void fetchLegal();
  }, [me, tab, fetchUsers, fetchGroups, fetchScouts, fetchLegal]);

  async function patchUserStatus(
    userId: string,
    accountStatus: "ACTIVE" | "BLOCKED" | "BANNED",
    reason?: string,
  ) {
    const body =
      accountStatus === "ACTIVE"
        ? { accountStatus }
        : { accountStatus, reason: reason?.trim() ?? "" };
    const r = await apiJsonAuth<{ ok?: boolean } | ApiErr>(
      `/admin/users/${userId}/account-status`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    if (!r.ok) {
      toastFromApi(r.data as ApiErr, "Não foi possível atualizar o status.");
      return;
    }
    toast.success("Status da conta atualizado.");
    setModerateUserId(null);
    setModerateKind(null);
    setModerateReason("");
    await fetchUsers();
  }

  async function resetPassword(userId: string, fullName: string) {
    if (
      !window.confirm(
        `Redefinir senha de «${fullName}» para a senha temporária padrão (12345678)?`,
      )
    ) {
      return;
    }
    const r = await apiJsonAuth<{ message?: string } | ApiErr>(
      `/admin/users/${userId}/reset-password`,
      { method: "POST", body: JSON.stringify({}) },
    );
    if (!r.ok) {
      toastFromApi(r.data as ApiErr, "Não foi possível redefinir a senha.");
      return;
    }
    const msg = (r.data as { message?: string }).message;
    toast.success(msg ?? "Senha redefinida.");
  }

  function openEditUser(u: AdminUserRow) {
    setEditUser(u);
    setEditForm({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      birthDate: birthDateToInput(u.birthDate),
      role: u.role,
      accountStatus: u.accountStatus,
      moderationReason: u.moderationReason ?? "",
      moderatedAtLocal: u.moderatedAt ? toDatetimeLocalValue(u.moderatedAt) : "",
      termsVersion: String(u.termsVersion),
      privacyVersion: String(u.privacyVersion),
      termsAcceptedAtLocal: toDatetimeLocalValue(u.termsAcceptedAt),
      privacyAcceptedAtLocal: toDatetimeLocalValue(u.privacyAcceptedAt),
      newPassword: "",
    });
  }

  function closeEditUser() {
    setEditUser(null);
    setEditForm(null);
  }

  async function submitEditUser() {
    if (!editUser || !editForm) return;
    const tv = Number.parseInt(editForm.termsVersion, 10);
    const pv = Number.parseInt(editForm.privacyVersion, 10);
    if (!Number.isFinite(tv) || tv < 1 || !Number.isFinite(pv) || pv < 1) {
      toast.error("Versões de termos e de privacidade devem ser inteiros ≥ 1.");
      return;
    }
    if (
      editForm.accountStatus !== "ACTIVE" &&
      editForm.moderationReason.trim().length < 3
    ) {
      toast.error("Para conta suspensa ou banida, informe o motivo (mín. 3 caracteres).");
      return;
    }
    const np = editForm.newPassword.trim();
    if (np.length > 0 && np.length < 8) {
      toast.error("Nova senha: mínimo 8 caracteres ou deixe em branco.");
      return;
    }

    const body: Record<string, unknown> = {
      fullName: editForm.fullName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      birthDate: editForm.birthDate,
      role: editForm.role,
      accountStatus: editForm.accountStatus,
      moderationReason:
        editForm.accountStatus === "ACTIVE" ? null : editForm.moderationReason.trim(),
      termsVersion: tv,
      privacyVersion: pv,
      termsAcceptedAt: fromDatetimeLocal(editForm.termsAcceptedAtLocal),
      privacyAcceptedAt: fromDatetimeLocal(editForm.privacyAcceptedAtLocal),
    };
    if (editForm.accountStatus === "ACTIVE") {
      body.moderatedAt = null;
    } else if (editForm.moderatedAtLocal.trim()) {
      body.moderatedAt = fromDatetimeLocal(editForm.moderatedAtLocal);
    }
    if (np.length > 0) {
      body.newPassword = np;
    }

    setEditSaving(true);
    try {
      const r = await apiJsonAuth<{ user: AdminUserRow } | ApiErr>(
        `/admin/users/${editUser.id}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível salvar a conta.");
        return;
      }
      toast.success("Conta atualizada.");
      closeEditUser();
      await fetchUsers();
    } finally {
      setEditSaving(false);
    }
  }

  async function createScoutMetric() {
    const sortOrder = Number.parseInt(newScoutOrder, 10);
    const order = Number.isFinite(sortOrder) ? sortOrder : 0;
    const r = await apiJsonAuth<{ metric?: ScoutMetricRow } | ApiErr>("/admin/scout-metrics", {
      method: "POST",
      body: JSON.stringify({
        sport: scoutSport,
        key: newScoutKey.trim(),
        label: newScoutLabel.trim(),
        sortOrder: order,
      }),
    });
    if (!r.ok) {
      toastFromApi(r.data as ApiErr, "Não foi possível criar a métrica.");
      return;
    }
    toast.success("Métrica criada.");
    setNewScoutKey("");
    setNewScoutLabel("");
    setNewScoutOrder("0");
    await fetchScouts();
  }

  async function setScoutMetricActive(id: string, isActive: boolean) {
    const r = await apiJsonAuth<{ metric?: ScoutMetricRow } | ApiErr>(
      `/admin/scout-metrics/${id}`,
      { method: "PATCH", body: JSON.stringify({ isActive }) },
    );
    if (!r.ok) {
      toastFromApi(r.data as ApiErr, "Não foi possível atualizar a métrica.");
      return;
    }
    toast.success(isActive ? "Métrica reativada." : "Métrica desativada (grupos deixam de usá-la).");
    await fetchScouts();
  }

  async function submitLegal() {
    if (!legalTitle.trim() || !legalContent.trim()) {
      toast.error("Título e conteúdo são obrigatórios.");
      return;
    }
    const r = await apiJsonAuth<{ document?: LegalDocRow } | ApiErr>("/admin/legal-documents", {
      method: "POST",
      body: JSON.stringify({
        slug: legalSlug,
        title: legalTitle.trim(),
        content: legalContent,
        setActive: legalSetActive,
      }),
    });
    if (!r.ok) {
      toastFromApi(r.data as ApiErr, "Não foi possível salvar o documento.");
      return;
    }
    toast.success(
      legalSetActive
        ? "Nova versão criada e marcada como vigente. Cadastro e app passam a usar este texto."
        : "Nova versão criada (não vigente).",
    );
    setLegalTitle("");
    setLegalContent("");
    await fetchLegal();
  }

  if (me === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Verificando permissões…
      </div>
    );
  }

  if (!me) {
    return null;
  }

  return (
    <AdminLayoutShell activeTab={tab} onTabChange={setTab}>
      <div className="w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      {tab === "users" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Redefinir senha aplica temporariamente <strong className="text-slate-300">12345678</strong>{" "}
            (avisar a pessoa). Bloquear ou banir exige motivo; a conta deixa de conseguir entrar.
          </p>
          {loadUsers ? (
            <p className="text-slate-400">Carregando…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[62rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-500">
                    <th className="p-3">Nome</th>
                    <th className="p-3">Celular</th>
                    <th className="p-3">E-mail</th>
                    <th className="p-3">Papel</th>
                    <th className="p-3">Situação da conta</th>
                    <th className="p-3">Motivo da moderação</th>
                    <th className="p-3">Cadastro</th>
                    <th className="p-3 w-64">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="p-3 text-white">{u.fullName}</td>
                      <td className="p-3 text-slate-300">{formatBrazilPhoneDisplay(u.phone)}</td>
                      <td className="p-3 text-slate-300">{u.email}</td>
                      <td className="p-3 text-slate-400">{roleLabel(u.role)}</td>
                      <td className="p-3">
                        <span
                          className={
                            u.accountStatus === "ACTIVE"
                              ? "text-emerald-300"
                              : u.accountStatus === "BANNED"
                                ? "text-red-300"
                                : "text-amber-200"
                          }
                        >
                          {accountStatusLabel(u.accountStatus)}
                        </span>
                      </td>
                      <td className="max-w-[12rem] truncate p-3 text-xs text-slate-500">
                        {u.moderationReason ?? "—"}
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {formatDateTimePt(u.createdAt)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => openEditUser(u)}
                            className="text-left text-xs font-medium text-sky-300 hover:underline"
                          >
                            Alterar conta…
                          </button>
                          {u.id !== me.id && u.accountStatus === "ACTIVE" && (
                            <>
                              <button
                                type="button"
                                onClick={() => void resetPassword(u.id, u.fullName)}
                                className="text-left text-xs text-turf-bright hover:underline"
                              >
                                Redefinir senha (12345678)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setModerateUserId(u.id);
                                  setModerateKind("BLOCKED");
                                  setModerateReason("");
                                }}
                                className="text-left text-xs text-amber-200 hover:underline"
                              >
                                Bloquear…
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setModerateUserId(u.id);
                                  setModerateKind("BANNED");
                                  setModerateReason("");
                                }}
                                className="text-left text-xs text-red-300 hover:underline"
                              >
                                Banir…
                              </button>
                            </>
                          )}
                          {u.id !== me.id && u.accountStatus !== "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => void patchUserStatus(u.id, "ACTIVE")}
                              className="text-left text-xs text-emerald-300 hover:underline"
                            >
                              Reativar conta
                            </button>
                          )}
                          {u.id === me.id && (
                            <span className="text-xs text-slate-600">Sua conta</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editUser && editForm && (
        <div className={MODAL_OVERLAY_CLASS}>
          <div className={`${MODAL_PANEL_SCROLL_CLASS} max-w-lg bg-pitch-950 p-4 sm:p-6`}>
            <h3 className="font-display text-lg font-semibold text-white">Alterar conta</h3>
            <p className="mt-1 text-xs text-slate-500">
              {editUser.fullName} · ID interno <span className="font-mono">{editUser.id}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Cadastro {formatDateTimePt(editUser.createdAt)} · Atualizado{" "}
              {formatDateTimePt(editUser.updatedAt)}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-name">
                  Nome completo
                </label>
                <input
                  id="adm-edit-name"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-email">
                  E-mail
                </label>
                <input
                  id="adm-edit-email"
                  type="email"
                  autoComplete="off"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-phone">
                  Celular (Brasil, com DDD — pode colar formatado)
                </label>
                <input
                  id="adm-edit-phone"
                  autoComplete="off"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-birth">
                  Nascimento
                </label>
                <input
                  id="adm-edit-birth"
                  type="date"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-role">
                  Papel
                </label>
                <select
                  id="adm-edit-role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                >
                  <option value="ATHLETE">Atleta</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-status">
                  Situação da conta
                </label>
                <select
                  id="adm-edit-status"
                  value={editForm.accountStatus}
                  onChange={(e) => setEditForm({ ...editForm, accountStatus: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                >
                  <option value="ACTIVE">Ativa</option>
                  <option value="BLOCKED">Suspensa</option>
                  <option value="BANNED">Banida</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label
                  className="block text-xs font-medium text-slate-400"
                  htmlFor="adm-edit-mod-reason"
                >
                  Motivo da moderação (obrigatório se suspensa ou banida)
                </label>
                <textarea
                  id="adm-edit-mod-reason"
                  rows={3}
                  value={editForm.moderationReason}
                  onChange={(e) => setEditForm({ ...editForm, moderationReason: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              {editForm.accountStatus !== "ACTIVE" && (
                <div className="sm:col-span-2">
                  <label
                    className="block text-xs font-medium text-slate-400"
                    htmlFor="adm-edit-mod-at"
                  >
                    Data/hora da moderação (opcional: vazio = agora)
                  </label>
                  <input
                    id="adm-edit-mod-at"
                    type="datetime-local"
                    value={editForm.moderatedAtLocal}
                    onChange={(e) =>
                      setEditForm({ ...editForm, moderatedAtLocal: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-tv">
                  Versão dos termos aceita
                </label>
                <input
                  id="adm-edit-tv"
                  inputMode="numeric"
                  value={editForm.termsVersion}
                  onChange={(e) => setEditForm({ ...editForm, termsVersion: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-pv">
                  Versão da privacidade aceita
                </label>
                <input
                  id="adm-edit-pv"
                  inputMode="numeric"
                  value={editForm.privacyVersion}
                  onChange={(e) => setEditForm({ ...editForm, privacyVersion: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-ta">
                  Aceite dos termos (data/hora)
                </label>
                <input
                  id="adm-edit-ta"
                  type="datetime-local"
                  value={editForm.termsAcceptedAtLocal}
                  onChange={(e) =>
                    setEditForm({ ...editForm, termsAcceptedAtLocal: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-pa">
                  Aceite da privacidade (data/hora)
                </label>
                <input
                  id="adm-edit-pa"
                  type="datetime-local"
                  value={editForm.privacyAcceptedAtLocal}
                  onChange={(e) =>
                    setEditForm({ ...editForm, privacyAcceptedAtLocal: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400" htmlFor="adm-edit-pw">
                  Nova senha (opcional, mín. 8 caracteres)
                </label>
                <input
                  id="adm-edit-pw"
                  type="password"
                  autoComplete="new-password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  placeholder="Deixe em branco para não alterar"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => void submitEditUser()}
                className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
              >
                {editSaving ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={closeEditUser}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {moderateUserId && moderateKind && (
        <div className={MODAL_OVERLAY_CLASS}>
          <div className={`${MODAL_PANEL_SCROLL_CLASS} max-w-md bg-pitch-950 p-4 sm:p-6`}>
            <h3 className="font-display text-lg font-semibold text-white">
              {moderateKind === "BANNED" ? "Banir conta" : "Bloquear conta"}
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              O motivo será exibido ao usuário ao tentar entrar ou ao usar a sessão.
            </p>
            <textarea
              value={moderateReason}
              onChange={(e) => setModerateReason(e.target.value)}
              rows={4}
              placeholder="Descreva o motivo (mín. 3 caracteres)…"
              className="mt-4 w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-2 text-sm text-white"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const r = moderateReason.trim();
                  if (r.length < 3) {
                    toast.error("O motivo deve ter pelo menos 3 caracteres.");
                    return;
                  }
                  void patchUserStatus(moderateUserId, moderateKind, r);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => {
                  setModerateUserId(null);
                  setModerateKind(null);
                  setModerateReason("");
                }}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "groups" && (
        <div>
          {loadGroups ? (
            <p className="text-slate-400">Carregando…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-500">
                    <th className="p-3">Nome do grupo</th>
                    <th className="p-3">Código público</th>
                    <th className="p-3">Visibilidade</th>
                    <th className="p-3">Esporte</th>
                    <th className="p-3">Membros</th>
                    <th className="p-3">Presidente</th>
                    <th className="p-3">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id} className="border-b border-white/5">
                      <td className="p-3 text-white">{g.name}</td>
                      <td className="p-3 font-mono text-slate-300">{g.publicCode}</td>
                      <td className="p-3 text-slate-400">{visibilityLabel(g.visibility)}</td>
                      <td className="p-3 text-slate-400">{sportLabel(g.sport)}</td>
                      <td className="p-3 text-slate-400">{g._count.members}</td>
                      <td className="p-3 text-slate-300">
                        {g.president.fullName}
                        <span className="block text-xs text-slate-500">
                          {formatBrazilPhoneDisplay(g.president.phone)}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">{formatDateTimePt(g.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "sports" && (
        <div className="space-y-8">
          <p className="text-xs text-slate-500">
            Métricas extras por esporte; grupos escolhem quais usar em «Scouts». Desativar remove a
            métrica da seleção dos grupos; dados em jogos antigos permanecem, sem edição.
          </p>
          {loadSports ? (
            <p className="text-slate-400">Carregando…</p>
          ) : (
            SPORTS.map((s) => (
              <div key={s.value} className="rounded-xl border border-white/10 bg-pitch-900/40 p-4">
                <h3 className="font-display text-base font-semibold text-white">{s.label}</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {(metricsBySport.get(s.value) ?? []).map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-1"
                    >
                      <span className="text-slate-300">
                        {m.label}{" "}
                        <span className="font-mono text-xs text-slate-500">
                          {m.key} · ordem {m.sortOrder}
                        </span>
                        {!m.isActive ? (
                          <span className="ml-2 text-xs text-amber-200/90">(inativa)</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void setScoutMetricActive(m.id, !m.isActive)
                        }
                        className={
                          m.isActive
                            ? "text-xs text-amber-200 hover:underline"
                            : "text-xs text-emerald-300 hover:underline"
                        }
                      >
                        {m.isActive ? "Desativar" : "Reativar"}
                      </button>
                    </li>
                  ))}
                  {(metricsBySport.get(s.value) ?? []).length === 0 && (
                    <li className="text-slate-500">Nenhuma métrica cadastrada.</li>
                  )}
                </ul>
              </div>
            ))
          )}

          <div className="rounded-xl border border-turf/25 bg-turf/5 p-4">
            <h3 className="text-sm font-semibold text-white">Nova métrica de scout</h3>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-slate-400">Esporte</label>
                <select
                  value={scoutSport}
                  onChange={(e) => setScoutSport(e.target.value)}
                  className="mt-1 rounded-lg border border-white/15 bg-pitch-950 px-2 py-2 text-sm text-white"
                >
                  {SPORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400">Chave (ex.: gols)</label>
                <input
                  value={newScoutKey}
                  onChange={(e) =>
                    setNewScoutKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  className="mt-1 w-40 rounded-lg border border-white/15 bg-pitch-950 px-2 py-2 font-mono text-sm text-white"
                  placeholder="gols"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Rótulo</label>
                <input
                  value={newScoutLabel}
                  onChange={(e) => setNewScoutLabel(e.target.value)}
                  className="mt-1 w-48 rounded-lg border border-white/15 bg-pitch-950 px-2 py-2 text-sm text-white"
                  placeholder="Gols"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Ordem</label>
                <input
                  value={newScoutOrder}
                  onChange={(e) => setNewScoutOrder(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  className="mt-1 w-20 rounded-lg border border-white/15 bg-pitch-950 px-2 py-2 text-sm text-white"
                  placeholder="0"
                />
              </div>
              <button
                type="button"
                onClick={() => void createScoutMetric()}
                className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "legal" && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">
            Ao marcar <strong className="text-slate-300">tornar vigente</strong>, a nova versão passa
            a valer no cadastro de novos usuários e nas telas públicas de termos e privacidade.
          </p>
          {loadLegal ? (
            <p className="text-slate-400">Carregando…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-500">
                    <th className="p-3">Documento</th>
                    <th className="p-3">Versão</th>
                    <th className="p-3">Título</th>
                    <th className="p-3">Em vigor</th>
                    <th className="p-3">Registrado em</th>
                  </tr>
                </thead>
                <tbody>
                  {legalDocs.map((d) => (
                    <tr key={d.id} className="border-b border-white/5">
                      <td className="p-3 text-slate-300">{legalSlugLabel(d.slug)}</td>
                      <td className="p-3 font-mono text-slate-400">{d.version}</td>
                      <td className="p-3 text-white">{d.title}</td>
                      <td className="p-3">
                        {d.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-600/25">
                            Vigente
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-500">{formatDateTimePt(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-xl border border-turf/25 bg-turf/5 p-4">
            <h3 className="text-sm font-semibold text-white">Publicar nova versão</h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-slate-400">Documento</label>
                <select
                  value={legalSlug}
                  onChange={(e) => setLegalSlug(e.target.value as "terms" | "privacy")}
                  className="mt-1 rounded-lg border border-white/15 bg-pitch-950 px-2 py-2 text-sm text-white"
                >
                  <option value="terms">Termos de uso</option>
                  <option value="privacy">Política de privacidade</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400">Título</label>
                <input
                  value={legalTitle}
                  onChange={(e) => setLegalTitle(e.target.value)}
                  className="mt-1 w-full max-w-lg rounded-lg border border-white/15 bg-pitch-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Conteúdo (texto exibido na plataforma)</label>
                <textarea
                  value={legalContent}
                  onChange={(e) => setLegalContent(e.target.value)}
                  rows={12}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={legalSetActive}
                  onChange={(e) => setLegalSetActive(e.target.checked)}
                />
                Tornar esta versão vigente (recomendado)
              </label>
              <button
                type="button"
                onClick={() => void submitLegal()}
                className="rounded-xl bg-turf px-4 py-2 text-sm font-semibold text-pitch-950"
              >
                Salvar documento
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayoutShell>
  );
}
