import React from "react";

/**
 * Root pass-through. With the next-intl `[locale]` segment, the real <html>/<body> live in
 * `app/[locale]/layout.tsx` so the `lang` attribute can reflect the active locale (en/nl/de)
 * — which a top-level root layout can't know. Global metadata is defined there too.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
