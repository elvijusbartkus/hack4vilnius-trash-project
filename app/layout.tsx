import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atliekų išvežimas pagal poreikį",
  description: "Hack4Vilnius 2026 prototipas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="lt"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-sand text-ink font-sans">{children}</body>
    </html>
  );
}
