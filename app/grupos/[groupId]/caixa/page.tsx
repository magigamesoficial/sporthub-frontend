import type { Metadata } from "next";
import { CaixaPanel } from "./caixa-panel";

export const metadata: Metadata = {
  title: "Caixa — SportHub",
};

export default async function CaixaPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <CaixaPanel groupId={groupId} />;
}
