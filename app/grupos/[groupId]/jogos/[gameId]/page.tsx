import type { Metadata } from "next";
import { GameDetailPanel } from "./game-detail-panel";

export const metadata: Metadata = {
  title: "Jogo — SportHub",
};

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; gameId: string }>;
}) {
  const { groupId, gameId } = await params;
  return <GameDetailPanel groupId={groupId} gameId={gameId} />;
}
