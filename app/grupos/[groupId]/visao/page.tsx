import type { Metadata } from "next";
import { GrupoVisaoPanel } from "./grupo-visao-panel";

export const metadata: Metadata = {
  title: "Perfil do grupo — SportHub",
};

export default async function GrupoVisaoPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GrupoVisaoPanel groupId={groupId} />;
}
