"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJsonAuth, TOKEN_STORAGE_KEY } from "@/lib/api";
import { toastFromApi, toastNetworkError } from "@/lib/toast";
import { toast } from "sonner";

type GameRow = {
  id: string;
  title: string;
  location: string | null;
  startsAt: string;
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
  counts: { GOING: number; MAYBE: number; NOT_GOING: number };
};

type GamesResponse = {
  viewer: { canManageGames: boolean };
  games: GameRow[];
};

type ApiErr = { error?: string; code?: string };

function formatGameWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function defaultDatetimeLocalValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function JogosPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState(defaultDatetimeLocalValue);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    try {
      const r = await apiJsonAuth<GamesResponse | ApiErr>(`/groups/${groupId}/games`);
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (r.status === 403 || r.status === 404) {
        toastFromApi(r.data as ApiErr, "Sem acesso a este grupo.");
        setData(null);
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível carregar os jogos.");
        setData(null);
        return;
      }
      setData(r.data as GamesResponse);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const emptyHint = useMemo(
    () =>
      "Nenhum jogo agendado a partir de ontem. Crie o próximo — todos os membros podem marcar presença.",
    [],
  );

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const startsAt = new Date(startsAtLocal);
      if (Number.isNaN(startsAt.getTime())) {
        toast.warning("Data e hora inválidas.");
        return;
      }
      const r = await apiJsonAuth<{ game: { id: string } } | ApiErr>(`/groups/${groupId}/games`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || undefined,
          location: location.trim() || undefined,
          startsAt: startsAt.toISOString(),
        }),
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      if (!r.ok) {
        toastFromApi(r.data as ApiErr, "Não foi possível criar o jogo.");
        return;
      }
      const created = r.data as { game: { id: string } };
      toast.success("Jogo agendado.");
      setTitle("");
      setLocation("");
      setStartsAtLocal(defaultDatetimeLocalValue());
      router.push(`/grupos/${groupId}/jogos/${created.game.id}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_PUBLIC_API_URL")) {
        toast.error(
          "A URL da API não está configurada neste ambiente. Avise o administrador.",
        );
      } else {
        toastNetworkError();
      }
    } finally {
      setCreating(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
          ← Voltar ao grupo
        </Link>
        <p className="mt-6 text-sm text-slate-400">
          Confira a notificação na tela ou tente novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/grupos/${groupId}`} className="text-sm text-turf-bright hover:underline">
        ← Membros do grupo
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-white">Jogos</h1>
      <p className="mt-1 text-sm text-slate-400">
        Agende jogos e veja quem confirmou presença. Qualquer membro pode criar; líderes podem
        excluir.
      </p>

      <form
        onSubmit={(e) => void onCreate(e)}
        className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-pitch-900/60 p-6"
      >
        <h2 className="font-display text-lg font-semibold text-white">Novo jogo</h2>
        <div>
          <label className="block text-sm text-slate-300" htmlFor="jtitle">
            Título (opcional)
          </label>
          <input
            id="jtitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pelada sábado, treino…"
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300" htmlFor="jloc">
            Local (opcional)
          </label>
          <input
            id="jloc"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Campo X, arena…"
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300" htmlFor="jdt">
            Data e hora
          </label>
          <input
            id="jdt"
            type="datetime-local"
            required
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-pitch-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-turf/40"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-xl bg-turf py-3 font-semibold text-pitch-950 hover:bg-turf-bright disabled:opacity-50"
        >
          {creating ? "Criando…" : "Agendar jogo"}
        </button>
      </form>

      <h2 className="mt-10 font-display text-lg font-semibold text-white">Próximos jogos</h2>
      {data.games.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyHint}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/grupos/${groupId}/jogos/${g.id}`}
                className="block rounded-xl border border-white/10 bg-pitch-950/40 px-4 py-4 transition hover:border-turf/30 hover:bg-pitch-950/60"
              >
                <p className="font-medium text-white">{g.title}</p>
                <p className="mt-1 text-sm text-turf-bright/90">{formatGameWhen(g.startsAt)}</p>
                {g.location && (
                  <p className="mt-1 text-xs text-slate-400">{g.location}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {g.counts.GOING} vão · {g.counts.MAYBE} talvez · {g.counts.NOT_GOING} não vão
                  {g.createdBy && ` · por ${g.createdBy.fullName}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
