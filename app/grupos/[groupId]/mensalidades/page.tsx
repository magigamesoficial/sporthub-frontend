import type { Metadata } from "next";
import { MensalidadesPanel } from "./mensalidades-panel";

export const metadata: Metadata = {
  title: "Mensalidades — SportHub",
};

export default async function MensalidadesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <MensalidadesPanel groupId={groupId} />;
}
