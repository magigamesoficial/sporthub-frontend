import { GroupSettingsPanel } from "../group-settings-panel";

export default async function GroupConfigPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupSettingsPanel groupId={groupId} />;
}
