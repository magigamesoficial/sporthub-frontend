import Link from "next/link";

const features = [
  {
    title: "Grupos multiesporte",
    body: "Futebol, vôlei, beach tennis, padel, futvôlei, basquete e espaço para crescer. Um atleta pode participar de vários grupos e esportes.",
  },
  {
    title: "Papéis claros",
    body: "Presidente, vice, tesoureiro e moderadores com permissões definidas: finanças, jogos, scouts e aprovação de novos membros.",
  },
  {
    title: "Mensalidade e caixa",
    body: "Controle de quem está em dia ou devendo, extrato com receitas e despesas, e lançamento automático ao registrar pagamentos.",
  },
  {
    title: "Jogos e presença",
    body: "Marque jogos fixos ou avulsos, confirme presença ou ausência, tipos de vínculo (mensalista, diarista, convidado) na lista.",
  },
  {
    title: "Scouts e ranking",
    body: "Métricas por esporte configuráveis pelo admin; o grupo escolhe o que entra no ranking. Vitórias, empates e derrotas sempre visíveis.",
  },
  {
    title: "Contratações",
    body: "Encontre atletas por esporte e posição, convites com aceite na plataforma e histórico — ideal para completar o time no jogo.",
  },
  {
    title: "Perfil do atleta",
    body: "URL pública opcional, grupos que participa, avaliações por estrelas e configurações por grupo: posição, numeração e preferências.",
  },
  {
    title: "Grupos públicos e privados",
    body: "Descubra grupos abertos e inscreva-se; privados funcionam por convite. Código único de 6 dígitos para achar seu grupo.",
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 border-b border-white/10 bg-pitch-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-white"
          >
            Sport<span className="text-turf-bright">Hub</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/grupos"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:px-4"
            >
              Grupos
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:px-4"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-lg bg-turf px-3 py-2 text-sm font-semibold text-pitch-950 shadow-lg shadow-turf/20 transition hover:bg-turf-bright sm:px-4"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="mb-4 inline-flex rounded-full border border-turf/30 bg-turf/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-turf-bright">
            Multiesporte · Grupos · Atletas
          </p>
          <h1 className="font-display text-balance text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            O hub do seu grupo esportivo
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            SportHub reúne gestão de membros, finanças, jogos, ranking e
            contratações em um só lugar — pensado para quem organiza pelada,
            treinos ou equipes amadoras com seriedade (e sem planilha infinita).
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center rounded-xl bg-turf px-8 py-3.5 text-base font-semibold text-pitch-950 shadow-xl shadow-turf/25 transition hover:bg-turf-bright"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
            >
              Já tenho conta — entrar
            </Link>
          </div>
        </section>

        <section className="border-y border-white/10 bg-pitch-900/50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              O que você pode fazer
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Da presidência ao atleta convidado: cada um vê o que importa, com
              regras de acesso que respeitam a hierarquia do seu grupo.
            </p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-pitch-950/60 p-6 transition hover:border-turf/30 hover:bg-pitch-950/80"
                >
                  <h3 className="font-display text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="rounded-3xl border border-turf/20 bg-gradient-to-br from-turf/10 via-pitch-900/80 to-pitch-950 p-8 sm:p-12">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Pronto para organizar o próximo jogo?
            </h2>
            <p className="mt-3 max-w-xl text-slate-400">
              Cadastre-se, monte ou entre no seu grupo e deixe a operação nas
              mãos do SportHub.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="inline-flex items-center justify-center rounded-xl bg-turf px-8 py-3.5 font-semibold text-pitch-950 transition hover:bg-turf-bright"
              >
                Criar conta
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Fazer login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} SportHub. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
