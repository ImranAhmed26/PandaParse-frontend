import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";

/**
 * Allow crawling of the public marketing site; keep the authenticated app and auth flows
 * out of the index. Disallow paths use a wildcard middle segment because every route is
 * locale-prefixed (e.g. /en/dashboard, /de/workspace).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*/dashboard",
        "/*/workspace",
        "/*/uploads",
        "/*/documents",
        "/*/profile",
        "/*/auth/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
