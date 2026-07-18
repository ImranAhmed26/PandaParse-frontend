import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedUrl, languageAlternates } from "@/constants/site";

/**
 * Public, indexable routes only. Each entry lists the default-locale URL with hreflang
 * alternates for every locale, so search engines discover the localized variants. App and
 * auth routes are intentionally excluded (they're private / non-indexable).
 */
const PUBLIC_PATHS = ["", "/about", "/pricing", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: localizedUrl(routing.defaultLocale, path),
    lastModified,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
    alternates: { languages: languageAlternates(path) },
  }));
}
