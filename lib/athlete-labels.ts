/** Rótulos PT para dados vindos da API na área do atleta (evita exibir enums crus). */

export const ATHLETE_SPORT_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "FOOTBALL", label: "Futebol" },
  { value: "VOLLEYBALL", label: "Vôlei" },
  { value: "BEACH_TENNIS", label: "Beach tennis" },
  { value: "PADEL", label: "Padel" },
  { value: "FUTVOLEI", label: "Futvôlei" },
  { value: "BASKETBALL", label: "Basquete" },
];

const SPORT_LABELS: Record<string, string> = Object.fromEntries(
  ATHLETE_SPORT_SELECT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;

export function sportLabel(code: string): string {
  return SPORT_LABELS[code] ?? code;
}

export const GROUP_MEMBER_ROLE_LABELS: Record<string, string> = {
  PRESIDENT: "Presidente",
  VICE_PRESIDENT: "Vice-presidente",
  TREASURER: "Tesoureiro",
  MODERATOR: "Moderador",
  MEMBER: "Membro",
};

export function groupMemberRoleLabel(role: string): string {
  return GROUP_MEMBER_ROLE_LABELS[role] ?? role;
}

/** Estilo do selo de cargo nas listas de membros (borda + fundo + texto). */
export function groupMemberRoleBadgeClass(role: string): string {
  switch (role) {
    case "PRESIDENT":
      return "border-amber-400/55 bg-amber-500/20 text-amber-100 shadow-sm shadow-amber-900/20";
    case "VICE_PRESIDENT":
      return "border-sky-400/45 bg-sky-500/15 text-sky-100 shadow-sm shadow-sky-950/20";
    case "TREASURER":
      return "border-emerald-400/45 bg-emerald-500/15 text-emerald-100 shadow-sm shadow-emerald-950/25";
    case "MODERATOR":
      return "border-violet-400/45 bg-violet-500/15 text-violet-100 shadow-sm shadow-violet-950/25";
    case "MEMBER":
    default:
      return "border-slate-400/35 bg-slate-500/12 text-slate-200 shadow-sm shadow-black/15";
  }
}

/** Título curto do papel (ex.: cabeçalho «PRESIDENTE»). */
export function groupMemberRoleHeading(role: string): string {
  return groupMemberRoleLabel(role).toLocaleUpperCase("pt-BR");
}

export function groupVisibilityLabel(v: string): string {
  if (v === "PUBLIC") return "Público";
  if (v === "PRIVATE") return "Privado";
  return v;
}

/** Pé / mão predominante (valores do enum `DominantSide` na API). */
export const DOMINANT_SIDE_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Não informar" },
  { value: "LEFT", label: "Esquerdo" },
  { value: "RIGHT", label: "Direito" },
  { value: "BOTH", label: "Ambos / indiferente" },
];

export function dominantSideLabel(code: string | null | undefined): string {
  if (code == null || code === "") return "—";
  const row = DOMINANT_SIDE_SELECT_OPTIONS.find((o) => o.value === code);
  return row?.label ?? code;
}
