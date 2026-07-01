"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";

// Catches render/runtime errors in any route under [locale] (dashboard,
// workspace, etc.) so the app degrades to a friendly page instead of the
// blank "missing required error components" screen.
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the real error (and hook up error reporting here later).
    console.error("🧯 [error boundary] Route error:", error);
  }, [error]);

  return (
    <div className="min-h-[70dvh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          We couldn&apos;t load this page. This is usually temporary — please try again in a moment.
          {error?.digest ? (
            <span className="block mt-2 text-xs text-gray-400 dark:text-gray-500">Reference: {error.digest}</span>
          ) : null}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
