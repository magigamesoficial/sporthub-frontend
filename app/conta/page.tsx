import type { Metadata } from "next";
import { ContaPanel } from "./conta-panel";

export const metadata: Metadata = {
  title: "Minha conta — SportHub",
};

export default function ContaPage() {
  return <ContaPanel />;
}
