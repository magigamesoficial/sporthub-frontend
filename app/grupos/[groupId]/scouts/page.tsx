import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Scouts do grupo — SportHub",
};

export default async function ScoutsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  redirect(`/grupos/${groupId}/configuracao?sec=scouts`);
}
