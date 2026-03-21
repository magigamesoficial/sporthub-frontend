import Link from "next/link";

export const metadata = {
  title: "Entrar — SportHub",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="mb-8 font-display text-xl font-bold text-white"
      >
        Sport<span className="text-turf-bright">Hub</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-pitch-900/60 p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Entrar</h1>
        <p className="mt-3 text-sm text-slate-400">
          O login com telefone e senha será implementado em breve.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-turf-bright hover:underline"
        >
          ← Voltar à página inicial
        </Link>
      </div>
    </div>
  );
}
