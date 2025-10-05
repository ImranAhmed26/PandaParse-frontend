"use client";

import { Link } from "@/i18n/navigation";
import { FolderKanban, Trash2 } from "lucide-react";
import type { Workspace } from "../types";

interface WorkspaceCardProps {
  workspace: Workspace;
  onDelete?: (id: string, name: string) => void;
  isDeleting?: boolean;
}

export function WorkspaceCard({ workspace, onDelete, isDeleting }: WorkspaceCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    onDelete?.(workspace.id, workspace.name);
  };

  return (
    <Link
      href={`/workspace/${workspace.id}`}
      className="group border border-gray-200 dark:border-gray-600 rounded-xl p-5 bg-white dark:bg-hexaGray hover:shadow-md transition-shadow relative block"
    >
      <div className="flex items-start gap-4">
        <div className="bg-gray-100 dark:bg-quadraGray p-3 rounded-lg flex-shrink-0">
          <FolderKanban className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white group-hover:underline truncate">{workspace.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {workspace.documentCount || 0} document{(workspace.documentCount || 0) !== 1 && "s"}
          </p>
          <p className="text-xs text-gray-400 mt-1">Created {new Date(workspace.createdAt).toLocaleDateString()}</p>

          {/* Stats */}
          {(workspace.documentCount || workspace.jobsCount) && (
            <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>📄 {workspace.documentCount || 0} docs</span>
              <span>⚡ {workspace.jobsCount || 0} jobs</span>
            </div>
          )}
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="absolute top-3 right-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
            title="Delete workspace"
          >
            {isDeleting ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </Link>
  );
}
