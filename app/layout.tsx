//app/layout.tsx
import type { Metadata, Viewport } from "next";
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
  title: {
    default: "KroniX Buyer",
    template: "%s | KroniX Buyer",
  },
  description: "KroniX App Clientes",
  manifest: "/manifest.webmanifest",
  applicationName: "KroniX",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KroniX",
  },
  icons: {
  icon: "/kronix-icon.png",
  shortcut: "/kronix-icon.png",
  apple: "/kronix-icon.png",
},
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        {children}
      </body>
    </html>
  );
}
