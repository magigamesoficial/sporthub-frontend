import { LoggedInLayout } from "@/components/logged-in-layout";

export default function ContaLayout({ children }: { children: React.ReactNode }) {
  return <LoggedInLayout>{children}</LoggedInLayout>;
}
