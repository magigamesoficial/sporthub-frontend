import type { Metadata } from "next";
import { ScoutsSettingsPanel } from "./scouts-settings-panel";

export const metadata: Metadata = {
  title: "Scouts do grupo — SportHub",
};

export default async function ScoutsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <ScoutsSettingsPanel groupId={groupId} />;
}
