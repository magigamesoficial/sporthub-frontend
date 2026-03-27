import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
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
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Providers>
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
