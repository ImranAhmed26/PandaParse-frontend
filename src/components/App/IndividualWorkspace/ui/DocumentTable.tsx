"use client";

import { useState } from "react";
import {
  FileText,
  Image,
  File,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Eye,
  Download,
  RotateCcw,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";

import type { Document, DocumentStatus } from "../types";

interface DocumentTableProps {
  documents: Document[];
  selectedDocuments: string[];
  onDocumentSelect: (document: Document) => void;
  onDocumentToggle: (documentId: string) => void;
  onSelectAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
  onDocumentDelete: (documentId: string) => void;
  onDocumentReprocess: (documentId: string) => void;
  onDocumentDownload: (documentId: string) => void;
  onBulkDelete?: () => void;
  onBulkReprocess?: () => void;
  onBulkExport?: () => void;
  onExportAll?: () => void;
  onSort?: (field: string, direction: "asc" | "desc") => void;
  totalCount?: number;
  isLoading?: boolean;
  className?: string;
}

interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

const columns: TableColumn[] = [
  { key: "selection", label: "", sortable: false, width: "w-16", align: "center" },
  { key: "name", label: "Name", sortable: true, width: "min-w-0 flex-1", align: "left" },
  { key: "status", label: "Status", sortable: true, width: "w-28", align: "center" },
  { key: "uploaded", label: "Uploaded", sortable: true, width: "w-28", align: "center" },
  { key: "size", label: "Size", sortable: true, width: "w-20", align: "right" },
  { key: "confidence", label: "Confidence", sortable: true, width: "w-24", align: "center" },
  { key: "actions", label: "Actions", sortable: false, width: "w-20", align: "center" },
];

export function DocumentTable({
  documents,
  selectedDocuments,
  onDocumentSelect,
  onDocumentToggle,
  onSelectAll,
  allSelected,
  someSelected,
  onDocumentDelete,
  onDocumentReprocess,
  onDocumentDownload,
  onBulkDelete,
  onBulkReprocess,
  onBulkExport,
  onExportAll,
  onSort,
  isLoading,
  className = "",
}: DocumentTableProps) {
  const [sortField, setSortField] = useState<string>("uploaded");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  // Get status display
  const getStatusDisplay = (status: DocumentStatus) => {
    switch (status) {
      case "uploading":
        return {
          icon: Upload,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          label: "Uploading",
        };
      case "queued":
        return {
          icon: Clock,
          color: "text-yellow-600 dark:text-yellow-400",
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          label: "Queued",
        };
      case "processing":
        return {
          icon: Clock,
          color: "text-yellow-600 dark:text-yellow-400",
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          label: "Processing",
        };
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-green-600 dark:text-green-400",
          bg: "bg-green-50 dark:bg-green-900/20",
          label: "Completed",
        };
      case "failed":
        return {
          icon: XCircle,
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-50 dark:bg-red-900/20",
          label: "Failed",
        };
      default:
        return {
          icon: File,
          color: "text-gray-600 dark:text-gray-400",
          bg: "bg-gray-50 dark:bg-gray-900/20",
          label: "Unknown",
        };
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  // Handle sort
  const handleSort = (field: string) => {
    if (!columns.find((col) => col.key === field)?.sortable) return;

    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          {/* Header Skeleton */}
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
                  {columns.map((_, index) => (
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
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          <FileText className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No documents found</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Upload some documents to get started with OCR processing.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Documents ({documents.length})</h2>
          {documents.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={onSelectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedDocuments.length > 0 ? `${selectedDocuments.length} selected` : "Select all"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export All Button */}
          {onExportAll && documents.length > 0 && (
            <button
              onClick={onExportAll}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-300 dark:border-gray-600"
            >
              <Download className="h-4 w-4" />
              Export All
            </button>
          )}

          {/* Mobile Sort Indicator */}
          <div className="block md:hidden">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Sorted by {sortField} ({sortDirection === "asc" ? "ascending" : "descending"})
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedDocuments.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                {selectedDocuments.length} document{selectedDocuments.length !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onBulkExport && (
                <button
                  onClick={onBulkExport}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              )}
              {onBulkReprocess && (
                <button
                  onClick={onBulkReprocess}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-md transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reprocess
                </button>
              )}
              {onBulkDelete && (
                <button
                  onClick={onBulkDelete}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 hover:bg-red-100 dark:hover:bg-red-800 rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-300 dark:border-gray-700 rounded-large overflow-hidden">
        {/* Mobile Card View */}
        <div className="block md:hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {documents.map((document) => {
              const FileIcon = getFileIcon(document.mimeType);
              const statusDisplay = getStatusDisplay(document.status);
              const StatusIcon = statusDisplay.icon;
              const isSelected = selectedDocuments.includes(document.id);

              return (
                <div
                  key={document.id}
                  className={`p-4 ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-900/20"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  } transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onDocumentToggle(document.id)}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                    />

                    {/* File Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <FileIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* File Name */}
                      <button
                        onClick={() => onDocumentSelect(document)}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block max-w-full text-left mb-1"
                        title={document.originalName}
                      >
                        {document.originalName}
                      </button>

                      {/* Status and Details */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusDisplay.bg}`}
                        >
                          <StatusIcon className={`h-3 w-3 ${statusDisplay.color}`} />
                          <span className={statusDisplay.color}>{statusDisplay.label}</span>
                        </div>
                        {document.ocrResults && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            {Math.round(document.ocrResults.confidence * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Meta Information */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatDate(document.uploadedAt)}</span>
                        <span>{formatFileSize(document.fileSize)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <button
                          onClick={() => setShowActionsFor(showActionsFor === document.id ? null : document.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {showActionsFor === document.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              {document.status === "completed" && (
                                <button
                                  onClick={() => {
                                    onDocumentSelect(document);
                                    setShowActionsFor(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  onDocumentDownload(document.id);
                                  setShowActionsFor(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </button>

                              {document.status === "failed" && (
                                <button
                                  onClick={() => {
                                    onDocumentReprocess(document.id);
                                    setShowActionsFor(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reprocess
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  onDocumentDelete(document.id);
                                  setShowActionsFor(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          {/* Table Header */}
          <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-[4rem_1fr_7rem_7rem_5rem_6rem_5rem] gap-4 px-6 py-3">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={`
                  flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                  ${column.align === "center" ? "justify-center" : column.align === "right" ? "justify-end" : "justify-start"}
                  ${column.sortable ? "cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" : ""}
                `}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.key === "selection" ? (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={onSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  ) : (
                    <>
                      <span>{column.label}</span>
                      {column.sortable && (
                        <div className="flex flex-col">
                          <ChevronUp
                            className={`h-3 w-3 ${
                              sortField === column.key && sortDirection === "asc"
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-gray-400"
                            }`}
                          />
                          <ChevronDown
                            className={`h-3 w-3 -mt-1 ${
                              sortField === column.key && sortDirection === "desc"
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-300 dark:divide-gray-700">
            {documents.map((document) => {
              const FileIcon = getFileIcon(document.mimeType);
              const statusDisplay = getStatusDisplay(document.status);
              const StatusIcon = statusDisplay.icon;
              const isSelected = selectedDocuments.includes(document.id);

              return (
                <div
                  key={document.id}
                  className={`
                  grid grid-cols-[4rem_1fr_7rem_7rem_5rem_6rem_5rem] gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                  ${isSelected ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}
                `}
                >
                  {/* Selection */}
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onDocumentToggle(document.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                    />
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <FileIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => onDocumentSelect(document)}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block w-full text-left"
                        title={document.originalName}
                      >
                        {document.originalName}
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-center">
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusDisplay.bg}`}
                    >
                      <StatusIcon className={`h-3 w-3 ${statusDisplay.color}`} />
                      <span className={statusDisplay.color}>{statusDisplay.label}</span>
                    </div>
                  </div>

                  {/* Uploaded */}
                  <div className="flex items-center justify-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(document.uploadedAt)}</span>
                  </div>

                  {/* Size */}
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{formatFileSize(document.fileSize)}</span>
                  </div>

                  {/* Confidence */}
                  <div className="flex items-center justify-center">
                    {document.ocrResults ? (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        {Math.round(document.ocrResults.confidence * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsFor(showActionsFor === document.id ? null : document.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {showActionsFor === document.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                          <div className="py-1">
                            {document.status === "completed" && (
                              <button
                                onClick={() => {
                                  onDocumentSelect(document);
                                  setShowActionsFor(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </button>
                            )}

                            <button
                              onClick={() => {
                                onDocumentDownload(document.id);
                                setShowActionsFor(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>

                            {document.status === "failed" && (
                              <button
                                onClick={() => {
                                  onDocumentReprocess(document.id);
                                  setShowActionsFor(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Reprocess
                              </button>
                            )}

                            <button
                              onClick={() => {
                                onDocumentDelete(document.id);
                                setShowActionsFor(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
