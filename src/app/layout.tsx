import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Bricolage_Grotesque,
  Instrument_Sans,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const landingDisplay = Bricolage_Grotesque({
  variable: "--font-landing-display",
  subsets: ["latin"],
  display: "swap",
});

const landingBody = Instrument_Sans({
  variable: "--font-landing-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Riff — AI Music Generator",
  description:
    "Describe the music in your head. Riff generates it in seconds. Powered by ACE-Step, free and open-source.",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Riff — AI Music Generator",
    description: "Describe the music in your head. Riff generates it in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${landingDisplay.variable} ${landingBody.variable}`}>
      <body className="antialiased">
        <div className="gradient-mesh" />
        <div className="noise-overlay" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
