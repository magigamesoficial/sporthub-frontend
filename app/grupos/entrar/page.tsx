import type { Metadata } from "next";
import { EntrarPanel } from "./entrar-panel";

export const metadata: Metadata = {
  title: "Entrar em grupo — SportHub",
};

export default function EntrarGrupoPage() {
  return <EntrarPanel />;
}
