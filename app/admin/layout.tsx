import { LoggedInLayout } from "@/components/logged-in-layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <LoggedInLayout>{children}</LoggedInLayout>;
}
