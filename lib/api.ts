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
  return { ok: res.ok, status: res.status, data };
}
