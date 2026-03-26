import type { Metadata } from "next";
import { BuscarGruposPanel } from "./buscar-grupos-panel";

export const metadata: Metadata = {
  title: "Buscar grupos — SportHub",
};

export default function BuscarGruposPage() {
  return <BuscarGruposPanel />;
}
