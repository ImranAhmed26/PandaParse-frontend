// middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclude API/internal paths, files with an extension (icon.svg, sitemap.xml, robots.txt),
  // and the extensionless metadata image routes so they aren't locale-redirected.
  matcher: "/((?!api|trpc|_next|_vercel|opengraph-image|twitter-image|.*\\..*).*)",
};
