import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Riff — AI Music Generator",
  description:
    "Describe the music in your head. Riff generates it in seconds. Powered by ACE-Step, free and open-source.",
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="gradient-mesh" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
