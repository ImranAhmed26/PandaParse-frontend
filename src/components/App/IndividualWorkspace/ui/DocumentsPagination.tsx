"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface DocumentsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function DocumentsPagination({ page, totalPages, total, limit, onPageChange, isLoading }: DocumentsPaginationProps) {
  // Nothing to paginate
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const canPrev = page > 1 && !isLoading;
  const canNext = page < totalPages && !isLoading;

  return (
    <div className="flex items-center justify-between gap-4 px-3 py-3 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
        <span>
          Showing <span className="font-medium text-gray-900 dark:text-gray-100">{from}</span>–
          <span className="font-medium text-gray-900 dark:text-gray-100">{to}</span> of{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span>
        </span>
        {isLoading && (
          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </span>
        )}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span className="text-sm text-gray-600 dark:text-gray-400">
          Page <span className="font-medium text-gray-900 dark:text-gray-100">{page}</span> of{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">{totalPages}</span>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
