import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { metadataConst } from "../constants/AppConstants";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: metadataConst.title,
  description: metadataConst.description,
  other: {
    // Opt out of the Dark Reader browser extension. The app has its own
    // (next-themes) dark mode, and Dark Reader rewrites SVG attributes/styles
    // before React hydrates, causing hydration mismatches. This meta tells the
    // extension to leave the DOM untouched. See https://github.com/darkreader/darkreader
    "darkreader-lock": "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f5f5f5] text-gray-700 dark:bg-[#1a2744] dark:text-indigo-200`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
