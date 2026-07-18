import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_URL,
  languageAlternates,
  localizedUrl,
  ogLocale,
} from "@/constants/site";
import { JsonLd } from "@/components/seo/JsonLd";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: SEO_KEYWORDS,
    alternates: { canonical: localizedUrl(locale), languages: languageAlternates() },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      url: localizedUrl(locale),
      locale: ogLocale(locale),
    },
    twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    other: {
      // Opt out of the Dark Reader extension, which rewrites the DOM before hydration and
      // causes mismatches — the app has its own (next-themes) dark mode.
      "darkreader-lock": "",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const messages = await getMessages();

  // Site-wide structured data. Organization + WebSite help search engines understand the
  // brand and can enable richer results (sitelinks, knowledge panel).
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: DEFAULT_DESCRIPTION,
      url: SITE_URL,
    },
  ];

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f5f5f5] text-gray-700 dark:bg-[#1a2744] dark:text-indigo-200`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <JsonLd data={jsonLd} />
      </body>
    </html>
  );
}
