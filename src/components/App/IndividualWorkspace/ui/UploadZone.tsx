"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Image, File, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useS3Upload } from "@/lib/hooks/useS3Upload";
// import type { UploadProgress } from "@/lib/hooks/useS3Upload";

interface UploadZoneProps {
  workspaceId: string;
  onUploadComplete?: (documents: any[]) => void;
  disabled?: boolean;
  className?: string;
}

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_FILE_TYPES = {
  "application/pdf": { icon: FileText, label: "PDF" },
  "image/jpeg": { icon: Image, label: "JPEG" },
  "image/jpg": { icon: Image, label: "JPG" },
  "image/png": { icon: Image, label: "PNG" },
  // "image/tiff": { icon: Image, label: "TIFF" },
  // "image/webp": { icon: Image, label: "WebP" },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

export function UploadZone({ workspaceId, onUploadComplete, disabled, className = "" }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workspace = useWorkspaceStore((state) => state.workspace);

  // Use S3 upload hook
  const { uploadFiles, uploadProgress, clearCompleted, hasActiveUploads, completedCount, errorCount } = useS3Upload({
    workspaceId,
    onUploadComplete: (document) => {
      console.log("📤 [UploadZone] Document uploaded:", document);
      onUploadComplete?.([document]);
    },
    onUploadError: (error, fileName) => {
      console.error("📤 [UploadZone] Upload error:", error, fileName);
    },
    onProgressUpdate: (progress) => {
      console.log("📤 [UploadZone] Progress update:", progress);
    },
  });

  // File validation
  const validateFile = (file: File): FileValidationResult => {
    // Check file type
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type}" is not supported. Allowed types: ${Object.values(ALLOWED_FILE_TYPES)
          .map((t) => t.label)
          .join(", ")}`,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File "${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }

    // Check for empty files
    if (file.size === 0) {
      return {
        valid: false,
        error: `File "${file.name}" is empty`,
      };
    }

    return { valid: true };
  };

  // Process selected files
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const errors: string[] = [];
      const validFiles: File[] = [];

      // Check total file count
      if (fileArray.length > MAX_FILES) {
        errors.push(`Too many files selected. Maximum is ${MAX_FILES} files at once.`);
        setValidationErrors(errors);
        return;
      }

      // Validate each file
      fileArray.forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          errors.push(validation.error!);
        }
      });

      setValidationErrors(errors);

      // Start S3 upload for valid files
      if (validFiles.length > 0) {
        try {
          await uploadFiles(validFiles);

          // Clear validation errors after successful upload initiation
          setTimeout(() => {
            setValidationErrors([]);
          }, 1000);
        } catch (error) {
          console.error("📤 [UploadZone] Failed to start uploads:", error);
          setValidationErrors((prev) => [...prev, "Failed to start upload process"]);
        }
      }
    },
    [uploadFiles]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, processFiles]
  );

  // File input handler
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset input value to allow selecting the same files again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processFiles]
  );

  // Click handler for upload zone
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Clear completed uploads
  const handleClearCompleted = useCallback(() => {
    clearCompleted();
  }, [clearCompleted]);

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    const fileType = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES];
    return fileType ? fileType.icon : File;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 ease-in-out
          ${
            isDragOver
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02] shadow-xl shadow-indigo-500/10 dark:shadow-indigo-500/20"
              : "border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500"
          }
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-lg hover:shadow-gray-500/5 dark:hover:shadow-gray-900/20"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={Object.keys(ALLOWED_FILE_TYPES).join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <div
            className={`mx-auto w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 ease-in-out ${
              isDragOver
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 scale-110 shadow-lg shadow-indigo-500/20"
                : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Upload className={`transition-all duration-200 ${isDragOver ? "h-8 w-8" : "h-6 w-6"}`} />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {isDragOver ? "Drop files here" : "Upload documents"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Drag and drop files here, or click to select files</p>

            <div className="text-xs text-gray-400 dark:text-gray-500 space-y-2">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-1 sm:gap-2">
                <span className="mb-1 sm:mb-0">Supported formats:</span>
                <div className="flex flex-wrap gap-1 justify-center">
                  {Object.values(ALLOWED_FILE_TYPES).map((type) => (
                    <span
                      key={type.label}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 font-medium"
                    >
                      {type.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                  Max: {MAX_FILE_SIZE / (1024 * 1024)}MB
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md">Up to {MAX_FILES} files</span>
              </div>
              {workspace?.settings.autoProcess && (
                <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <CheckCircle className="h-3 w-3" />
                  <span>Auto-processing enabled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Upload Errors</h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 dark:text-red-400 mt-1">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Upload Progress ({uploadProgress.length} file{uploadProgress.length !== 1 ? "s" : ""})
            </h4>

            {completedCount > 0 && !hasActiveUploads && (
              <button
                onClick={handleClearCompleted}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="space-y-3">
            {uploadProgress.map((item) => {
              const FileIcon = getFileIcon("application/pdf"); // Default icon, could be enhanced

              return (
                <div
                  key={item.fileId}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors duration-200"
                >
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                      <FileIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.fileName}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-1 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${
                          item.status === "completed"
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : item.status === "error"
                            ? "bg-gradient-to-r from-red-500 to-red-600"
                            : "bg-gradient-to-r from-indigo-500 to-indigo-600"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(item.status === "pending" || item.status === "uploading") && (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                            <span className="text-xs text-indigo-600 dark:text-indigo-400">
                              {item.status === "pending" ? "Preparing..." : "Uploading..."}
                            </span>
                          </>
                        )}
                        {item.status === "completed" && (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-600 dark:text-green-400">Completed</span>
                          </>
                        )}
                        {item.status === "error" && (
                          <>
                            <AlertCircle className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-600 dark:text-red-400">
                              Failed: {item.error || "Unknown error"}
                            </span>
                          </>
                        )}
                      </div>

                      <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(item.progress)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {uploadProgress.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {completedCount} completed, {errorCount} failed, {uploadProgress.length - completedCount - errorCount} remaining
                </span>
                {hasActiveUploads && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
