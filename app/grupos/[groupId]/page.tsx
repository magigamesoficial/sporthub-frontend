import type { Metadata } from "next";
import { GroupDetail } from "./group-detail";

export const metadata: Metadata = {
  title: "Grupo — SportHub",
};

export default async function GrupoPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupDetail groupId={groupId} />;
}
