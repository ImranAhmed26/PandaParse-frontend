"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Settings, Users, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth/authStore";
import { canManageWorkspaceMembers } from "@/lib/auth/permissions";
import type { Workspace } from "../types";

interface WorkspaceHeaderProps {
  workspace: Workspace;
  onSettingsClick?: () => void;
}

export function WorkspaceHeader({ workspace, onSettingsClick }: WorkspaceHeaderProps) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);

  // Check permissions
  const canManageWorkspace = workspace.ownerId === user?.id;
  const canManageMembers = canManageWorkspaceMembers(user);

  return (
    <div className="bg-white dark:bg-hexaGray border border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="flex justify-between px-6 py-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/workspace" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
            Workspaces
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">{workspace.name}</span>
        </div>

        {/* Right Side - Stats & Actions */}
        <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{workspace.stats.totalDocuments}</div>
              <div className="">Documents</div>
            </div>

            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{workspace.stats.processingDocuments}</div>
              <div className="">Processing</div>
            </div>

            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{workspace.stats.completedDocuments}</div>
              <div className="">Completed</div>
            </div>

            {workspace.stats.failedDocuments > 0 && (
              <div className="text-center">
                <div className="font-semibold text-red-600 dark:text-red-400">{workspace.stats.failedDocuments}</div>
                <div className="">Failed</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Members Count */}
            {canManageMembers && (
              <button
                onClick={onSettingsClick}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Manage members"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{workspace.members.length}</span>
              </button>
            )}

            {/* Settings Button - Only for owners */}
            {canManageWorkspace && (
              <button
                onClick={onSettingsClick}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Workspace settings"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            {/* More Actions - Mobile */}
            <div className="relative md:hidden">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showActions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <div className="py-2">
                    {canManageMembers && (
                      <button
                        onClick={() => {
                          onSettingsClick?.();
                          setShowActions(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Users className="h-4 w-4" />
                        Manage Members
                      </button>
                    )}

                    {canManageWorkspace && (
                      <button
                        onClick={() => {
                          onSettingsClick?.();
                          setShowActions(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
