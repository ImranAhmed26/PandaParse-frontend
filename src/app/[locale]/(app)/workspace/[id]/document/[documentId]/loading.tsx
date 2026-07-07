export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>

      {/* Toolbar */}
      <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />

      {/* Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-h-[70vh] bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="min-h-[70vh] bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}
