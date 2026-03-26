import type { Metadata } from "next";
import { LoggedInLayout } from "@/components/logged-in-layout";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = {
  title: "Administração — SportHub",
};

export default function AdminPage() {
  return (
    <LoggedInLayout>
      <AdminPanel />
    </LoggedInLayout>
  );
}
