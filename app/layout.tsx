import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SportHub — Gestão de grupos esportivos",
  description:
    "Plataforma multiesporte para grupos: mensalidades, jogos, ranking, contratações e muito mais.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${outfit.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
