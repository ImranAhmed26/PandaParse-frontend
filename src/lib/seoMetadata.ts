import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { languageAlternates, localizedUrl } from "@/constants/site";

/**
 * Build localized page metadata (title/description/canonical/hreflang/OG) from a
 * `Meta.<key>` message namespace and the route's path. Server-only — call from a page's
 * `generateMetadata`. The home page (path "") uses an absolute title; other pages inherit
 * the `%s | OCRParse` template from the root layout.
 */
export async function pageMetadata(
  locale: string,
  key: string,
  path = "",
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `Meta.${key}` });
  const url = localizedUrl(locale, path);
  return {
    title: path === "" ? { absolute: t("title") } : t("title"),
    description: t("description"),
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: { title: t("title"), description: t("description"), url },
  };
}
