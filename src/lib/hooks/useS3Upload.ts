import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { uploadApi } from "@/lib/api/upload";
import type { CompleteUploadResponse } from "@/lib/api/upload";

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

export interface UseS3UploadOptions {
  workspaceId: string;
  onUploadComplete?: (document: CompleteUploadResponse["document"]) => void;
  onUploadError?: (error: Error, fileName: string) => void;
  onProgressUpdate?: (progress: UploadProgress) => void;
}

export function useS3Upload({ workspaceId, onUploadComplete, onUploadError, onProgressUpdate }: UseS3UploadOptions) {
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());

  // Single file upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, fileId }: { file: File; fileId: string }) => {
      return uploadApi.uploadFileWithProgress(file, workspaceId, (progress) => {
        const progressData: UploadProgress = {
          fileId,
          fileName: file.name,
          progress,
          status: progress === 100 ? "completed" : "uploading",
        };

        setUploadProgress((prev) => new Map(prev.set(fileId, progressData)));
        onProgressUpdate?.(progressData);
      });
    },
    onSuccess: (document, { fileId }) => {
      // Update progress to completed
      setUploadProgress((prev) => {
        const current = prev.get(fileId);
        if (current) {
          const completed: UploadProgress = {
            ...current,
            progress: 100,
            status: "completed",
          };
          return new Map(prev.set(fileId, completed));
        }
        return prev;
      });

      onUploadComplete?.(document);
    },
    onError: (error: Error, { file, fileId }) => {
      // Update progress to error
      setUploadProgress((prev) => {
        const current = prev.get(fileId);
        if (current) {
          const errorState: UploadProgress = {
            ...current,
            status: "error",
            error: error.message,
          };
          return new Map(prev.set(fileId, errorState));
        }
        return prev;
      });

      onUploadError?.(error, file.name);
    },
  });

  // Upload single file
  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Initialize progress
      const initialProgress: UploadProgress = {
        fileId,
        fileName: file.name,
        progress: 0,
        status: "pending",
      };

      setUploadProgress((prev) => new Map(prev.set(fileId, initialProgress)));
      onProgressUpdate?.(initialProgress);

      // Start upload
      uploadMutation.mutate({ file, fileId });

      return fileId;
    },
    [uploadMutation, onProgressUpdate]
  );

  // Upload multiple files
  const uploadFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      const fileIds: string[] = [];

      for (const file of files) {
        const fileId = await uploadFile(file);
        fileIds.push(fileId);
      }

      return fileIds;
    },
    [uploadFile]
  );

  // Get progress for a specific file
  const getFileProgress = useCallback(
    (fileId: string): UploadProgress | undefined => {
      return uploadProgress.get(fileId);
    },
    [uploadProgress]
  );

  // Get all upload progress
  const getAllProgress = useCallback((): UploadProgress[] => {
    return Array.from(uploadProgress.values());
  }, [uploadProgress]);

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setUploadProgress((prev) => {
      const filtered = new Map();
      prev.forEach((progress, fileId) => {
        if (progress.status !== "completed") {
          filtered.set(fileId, progress);
        }
      });
      return filtered;
    });
  }, []);

  // Clear all uploads
  const clearAll = useCallback(() => {
    setUploadProgress(new Map());
  }, []);

  // Cancel upload (note: S3 uploads can't be cancelled once started, but we can update UI)
  const cancelUpload = useCallback((fileId: string) => {
    setUploadProgress((prev) => {
      const current = prev.get(fileId);
      if (current && current.status === "uploading") {
        const cancelled: UploadProgress = {
          ...current,
          status: "error",
          error: "Upload cancelled by user",
        };
        return new Map(prev.set(fileId, cancelled));
      }
      return prev;
    });
  }, []);

  return {
    // Actions
    uploadFile,
    uploadFiles,
    cancelUpload,
    clearCompleted,
    clearAll,

    // State
    uploadProgress: getAllProgress(),
    getFileProgress,

    // Status
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error,

    // Utils
    hasActiveUploads: getAllProgress().some((p) => p.status === "uploading" || p.status === "pending"),
    completedCount: getAllProgress().filter((p) => p.status === "completed").length,
    errorCount: getAllProgress().filter((p) => p.status === "error").length,
    totalCount: getAllProgress().length,
  };
}
