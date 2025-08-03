"use client";

/**
 * Skeleton loading component for WorkspacePage
 * Matches the actual layout structure for consistent loading experience
 */
export function WorkspacePageSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-hexaGray border border-gray-300 dark:border-gray-700 rounded-xl">
          <div className="flex justify-between px-6 py-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>

            {/* Right side - Stats & Actions */}
            <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-4 xl:gap-6">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="text-center">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-8 mb-1"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md w-16"></div>
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md w-20"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation + Content Container Skeleton */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-xl">
          {/* Tab Navigation Skeleton */}
          <div className="bg-red-20 dark:bg-gray-8 rounded-xl">
            <div className="flex gap-2 p-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-medium w-32"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-medium w-28"></div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="p-2">
            {/* Content Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-2 mb-4">
              <div className="flex items-center gap-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-24"></div>
            </div>

            {/* Table Container Skeleton */}
            <div className="border border-gray-300 dark:border-gray-700 rounded-large overflow-hidden">
              {/* Table Header Skeleton */}
              <div className="hidden md:block">
                <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-[4rem_1fr_7rem_7rem_5rem_6rem_5rem] gap-4 px-6 py-3">
                    {[...Array(7)].map((_, index) => (
                      <div key={index} className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-300 dark:divide-gray-700">
                {[...Array(5)].map((_, index) => (
                  <div key={index}>
                    {/* Desktop Row */}
                    <div className="hidden md:block">
                      <div className="grid grid-cols-[4rem_1fr_7rem_7rem_5rem_6rem_5rem] gap-4 px-6 py-4">
                        <div className="flex items-center justify-center">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4"></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-5"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md w-16"></div>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                        </div>
                        <div className="flex items-center justify-end">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4"></div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="block md:hidden p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4 mt-1"></div>
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-5 mt-1"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="flex items-center gap-2">
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-md w-16"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                          </div>
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
