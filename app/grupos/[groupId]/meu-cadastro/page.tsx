import { redirect } from "next/navigation";

/** Rota antiga: mantém links salvos. */
export default async function MeuCadastroRedirectPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  redirect(`/grupos/${groupId}/perfil`);
}
