import { PUBLIC_API_BASE_PRODUCTION } from "./api-config";

export const TOKEN_STORAGE_KEY = "sporthub_token";

export function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error(
      `NEXT_PUBLIC_API_URL não está configurada. Na Vercel: Settings → Environment Variables → NEXT_PUBLIC_API_URL = ${PUBLIC_API_BASE_PRODUCTION} (sem barra no final); em seguida Redeploy. Variáveis NEXT_PUBLIC_* entram no build do Next.`,
    );
  }
  return base;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });

  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** Headers para rotas protegidas (Bearer do `localStorage`). Só no client. */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function redirectIfSessionInvalid(status: number): void {
  if (typeof window === "undefined" || status !== 401) return;
  const p = window.location.pathname;
  if (p.startsWith("/login") || p.startsWith("/cadastro")) return;

  const hadToken = Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY));
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);

  if (!hadToken) return;

  window.location.assign("/login?session=expired");
}

/** `fetch` JSON com `Authorization: Bearer` por último (sobrescreve header homônimo do init). */
export async function apiJsonAuth<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
      ...getAuthHeaders(),
    },
  });

  const data = (await res.json().catch(() => ({}))) as T;

  if (typeof window !== "undefined" && res.status === 403) {
    const d = data as { code?: string; reason?: string | null };
    if (d.code === "ACCOUNT_BLOCKED" || d.code === "ACCOUNT_BANNED") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      const kind = d.code === "ACCOUNT_BANNED" ? "banned" : "blocked";
      const reasonQ =
        d.reason != null && String(d.reason).length > 0
          ? `&reason=${encodeURIComponent(String(d.reason))}`
          : "";
      window.location.assign(`/login?account=${kind}${reasonQ}`);
      return { ok: false, status: res.status, data };
    }
  }

  redirectIfSessionInvalid(res.status);

  return { ok: res.ok, status: res.status, data };
}
