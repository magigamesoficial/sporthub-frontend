import type { Metadata } from "next";
import { GroupDetail } from "../group-detail";

export const metadata: Metadata = {
  title: "Membros do grupo — SportHub",
};

export default async function MembrosPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupDetail groupId={groupId} />;
}
