import { LoggedInLayout } from "@/components/logged-in-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <LoggedInLayout>{children}</LoggedInLayout>;
}
