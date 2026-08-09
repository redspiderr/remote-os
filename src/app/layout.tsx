import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Merriweather } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import RootProviders from "@/components/RootProviders";
import PWAProvider from "@/components/PWAProvider";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "REMOTE OS — Async Video Standups",
  description: "Record async standup videos. Built for MEDINA OS.",
  keywords: ["async standups", "remote work", "video standups", "MEDINA OS", "REMOTE OS"],
  authors: [{ name: "MEDINA OS" }],
  openGraph: {
    title: "REMOTE OS — Async Video Standups",
    description: "Record async standup videos. Built for MEDINA OS.",
    type: "website",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2A6FBB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${merriweather.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0B0D17] text-[#F9F7F2]">
        <AuthProvider>
          <RootProviders>
            <PWAProvider>
              <Navbar />
              {children}
            </PWAProvider>
          </RootProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
