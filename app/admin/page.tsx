import type { Metadata } from "next";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = {
  title: "Administração — SportHub",
};

export default function AdminPage() {
  return <AdminPanel />;
}
