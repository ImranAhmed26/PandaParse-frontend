"use client";

// Catches errors thrown in the root layout / locale layout, where no other
// error boundary can render. Must define its own <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#f5f5f5] text-gray-700 dark:bg-[#1a2744] dark:text-indigo-200">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-sm opacity-80 mb-6">
              The application ran into an unexpected error. Please try again.
              {error?.digest ? <span className="block mt-2 text-xs opacity-60">Reference: {error.digest}</span> : null}
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
