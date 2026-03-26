import { LoggedInLayout } from "@/components/logged-in-layout";

export default function GruposLayout({ children }: { children: React.ReactNode }) {
  return <LoggedInLayout>{children}</LoggedInLayout>;
}
