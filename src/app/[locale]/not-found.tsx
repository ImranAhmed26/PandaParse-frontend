import { Link } from "@/i18n/navigation";

// Rendered when notFound() is called (e.g. unknown locale in the layout) or a
// route doesn't match. Keeps the user in a recoverable state.
export default function NotFound() {
  return (
    <div className="min-h-[70dvh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <p className="text-5xl font-bold text-indigo-600 mb-2">404</p>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Page not found</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
