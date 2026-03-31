import type { Metadata } from "next";
import { PerfilPanel } from "./perfil-panel";

export const metadata: Metadata = {
  title: "Perfil no grupo — SportHub",
};

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <PerfilPanel groupId={groupId} />;
}
