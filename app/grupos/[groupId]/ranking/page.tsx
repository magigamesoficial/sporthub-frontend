import type { Metadata } from "next";
import { RankingPanel } from "./ranking-panel";

export const metadata: Metadata = {
  title: "Classificação — SportHub",
};

export default async function RankingPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <RankingPanel groupId={groupId} />;
}
