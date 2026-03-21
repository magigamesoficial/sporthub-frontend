import type { Metadata } from "next";
import { GruposPanel } from "./grupos-panel";

export const metadata: Metadata = {
  title: "Grupos — SportHub",
};

export default function GruposPage() {
  return <GruposPanel />;
}
