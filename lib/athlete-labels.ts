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

/** Título curto do papel (ex.: cabeçalho «PRESIDENTE»). */
export function groupMemberRoleHeading(role: string): string {
  return groupMemberRoleLabel(role).toLocaleUpperCase("pt-BR");
}

export function groupVisibilityLabel(v: string): string {
  if (v === "PUBLIC") return "Público";
  if (v === "PRIVATE") return "Privado";
  return v;
}
