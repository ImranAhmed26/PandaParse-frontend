import { routing } from "@/i18n/routing";

/**
 * Site-wide SEO constants and URL helpers. Centralized so metadata, the sitemap, robots,
 * canonical/hreflang alternates and structured data all speak the same canonical origin.
 *
 * `localePrefix` is next-intl's default ("always"), so every public URL is `/{locale}{path}`.
 */

/** Canonical production origin, no trailing slash. Override per-env with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ocrparse.com").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "OCRParse";

export const DEFAULT_TITLE = "OCRParse — Accurate OCR for invoices, receipts & documents";
export const DEFAULT_DESCRIPTION =
  "Transform invoices, receipts, and documents into structured JSON/CSV data in seconds. OCRParse's AI extracts and structures your data with industry-leading accuracy.";

export const SEO_KEYWORDS = [
  "OCR",
  "invoice OCR",
  "receipt OCR",
  "document data extraction",
  "invoice data extraction",
  "PDF to JSON",
  "PDF to CSV",
  "accounts payable automation",
  "AP automation",
  "structured data extraction",
];

/** Map an app locale to an Open Graph `og:locale` value. */
const OG_LOCALE: Record<string, string> = { en: "en_US", nl: "nl_NL", de: "de_DE" };
export const ogLocale = (locale: string): string => OG_LOCALE[locale] ?? "en_US";

/** Absolute URL for a locale + path. `path` starts with "/" (or is "" for the home page). */
export function localizedUrl(locale: string, path = ""): string {
  return `${SITE_URL}/${locale}${path}`;
}

/** hreflang alternates map for a path: every locale plus `x-default` → the default locale. */
export function languageAlternates(path = ""): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) languages[locale] = localizedUrl(locale, path);
  languages["x-default"] = localizedUrl(routing.defaultLocale, path);
  return languages;
}
