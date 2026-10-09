import type { Metadata } from "next";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";

// Barlow: low-contrast grotesk modelled on highway and transport signage; latin-ext covers Lithuanian.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow-sc",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Trage – atliekų išvežimas pagal poreikį",
  description: "Hack4Vilnius 2026 prototipas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="lt"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowSemiCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ground font-sans text-ink">{children}</body>
    </html>
  );
}
