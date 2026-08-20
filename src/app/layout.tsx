import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter_Tight } from "next/font/google";
import "./globals.css";
import { getDictionary } from "@/lib/locale";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const t = getDictionary("es-PY");

export const metadata: Metadata = {
  title: t.brand.name,
  description: t.brand.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={t.meta.localeTag}>
      <body className={`${bricolage.variable} ${interTight.variable}`}>
        {children}
      </body>
    </html>
  );
}
