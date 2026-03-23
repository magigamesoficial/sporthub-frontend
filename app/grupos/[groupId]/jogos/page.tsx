import type { Metadata } from "next";
import { JogosPanel } from "./jogos-panel";

export const metadata: Metadata = {
  title: "Jogos — SportHub",
};

export default async function JogosPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <JogosPanel groupId={groupId} />;
}
