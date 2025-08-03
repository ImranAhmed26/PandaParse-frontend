"use client";

import { Upload, FileText } from "lucide-react";

export type TabType = "upload" | "documents";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  uploadCount?: number;
  documentCount?: number;
  className?: string;
}

export function TabNavigation({ activeTab, onTabChange, uploadCount, documentCount, className = "" }: TabNavigationProps) {
  const tabs = [
    {
      id: "upload" as TabType,
      label: "Upload Documents",
      icon: Upload,
      count: uploadCount,
    },
    {
      id: "documents" as TabType,
      label: "All Documents",
      icon: FileText,
      count: documentCount,
    },
  ];

  return (
    <div className={`bg-red-20 dark:bg-gray-8 rounded-xl ${className}`}>
      <div className="flex gap-2 p-2 border- border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 sm:px-6 py-2 text-sm font-medium transition-all duration-200 border whitespace-nowrap
                ${
                  isActive
                    ? "rounded-medium text-brandLight dark:text-brandDark border-brandLight dark:border-brandDark bg-indigo-50 dark:bg-indigo-900/10"
                    : "bg-gray-200 dark:bg-hexaGray border-gray-400 dark:border-gray-600 rounded-medium border-transparent hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`
                  inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full min-w-[20px]
                  ${
                    isActive
                      ? "bg-indigo-100 dark:bg-brandDark text-indigo-700 dark:text-gray-900"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }
                `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
