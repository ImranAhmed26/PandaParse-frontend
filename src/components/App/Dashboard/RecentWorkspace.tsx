"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { FolderPlus, FolderKanban, Layers, AlertCircle } from "lucide-react";
import { AppButton } from "@/components/Interface/Button/AppButton";
import { useAuth } from "@/lib/auth/authStore";
import { useRecentWorkspaces } from "@/components/App/Workspace/workspace";
import { CreateWorkspaceForm } from "@/components/App/Workspace/ui/CreateWorkspaceForm";
import { canCreateWorkspace } from "@/lib/auth/permissions";

export function RecentWorkSpaceList() {
  const { user } = useAuth();
  const { data: recentWorkspaces, isLoading, error, isError, refetch } = useRecentWorkspaces();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Check if user can create workspaces
  const userCanCreateWorkspace = canCreateWorkspace(user);

  const hasWorkspaces = recentWorkspaces && recentWorkspaces.length > 0;

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
  };

  const handleCreateCancel = () => {
    setShowCreateForm(false);
  };

  return (
    <div className="rounded-medium border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 dark:bg-quadraGray rounded-t-medium">
        <h2 className="text-lg font-semibold dark:text-white">Your Recent Workspaces</h2>
        <div className="flex gap-2">
          <AppButton href="/workspace" icon={<Layers className="h-4 w-4" />}>
            View All
          </AppButton>

          {userCanCreateWorkspace && (
            <AppButton onClick={() => setShowCreateForm(true)} icon={<FolderPlus className="h-4 w-4" />}>
              Add Workspace
            </AppButton>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading recent workspaces...</span>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error loading recent workspaces</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {(error as any)?.message || "Failed to fetch recent workspaces. Please try again."}
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-3 text-sm text-red-800 dark:text-red-400 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success state with workspaces */}
        {!isLoading && !isError && hasWorkspaces && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentWorkspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspace/${ws.id}`}
                className="group border border-gray-200 dark:border-gray-600 rounded-xl p-5 bg-white dark:bg-hexaGray hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-gray-100 dark:bg-quadraGray p-3 rounded-lg">
                    <FolderKanban className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-white group-hover:underline truncate">
                      {ws.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {ws.documentsCount || 0} document{(ws.documentsCount || 0) !== 1 && "s"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Created {new Date(ws.createdAt).toLocaleDateString()}</p>

                    {/* Stats */}
                    {(ws.documentsCount || ws.jobsCount) && (
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>📄 {ws.documentsCount || 0} docs</span>
                        <span>⚡ {ws.jobsCount || 0} jobs</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && !hasWorkspaces && (
          <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-hexaGray/30">
            <FolderKanban className="w-10 h-10 mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-md font-semibold text-gray-700 dark:text-white mb-1">No workspaces found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {userCanCreateWorkspace
                ? "Start by creating a workspace to organize your documents."
                : "You don't have access to any workspaces yet. Contact your company administrator."}
            </p>
            {userCanCreateWorkspace && (
              <AppButton onClick={() => setShowCreateForm(true)} icon={<FolderPlus className="h-4 w-4" />}>
                Create Your First Workspace
              </AppButton>
            )}
          </div>
        )}
      </div>

      {/* Create workspace form modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <CreateWorkspaceForm onSuccess={handleCreateSuccess} onCancel={handleCreateCancel} />
        </div>
      )}
    </div>
  );
}
