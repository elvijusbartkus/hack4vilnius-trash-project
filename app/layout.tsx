import type { Metadata, Viewport } from "next";
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

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "WasteWise – atliekų išvežimas pagal poreikį",
  description: "Hack4Vilnius 2026 prototipas",
  applicationName: "WasteWise",
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [{ url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${base}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "WasteWise", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f5c4a",
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
