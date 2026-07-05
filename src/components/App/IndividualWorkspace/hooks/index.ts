import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { individualWorkspaceApi } from "../api";
import { useWorkspaceStore } from "../store/workspaceStore";
import type { GetDocumentsParams, UploadDocumentRequest, UpdateWorkspaceRequest, ExportRequest } from "../types";

// Query Keys - centralized for better cache management
export const individualWorkspaceKeys = {
  all: ["individual-workspace"] as const,
  workspace: (id: string) => [...individualWorkspaceKeys.all, "workspace", id] as const,
  documents: (workspaceId: string) => [...individualWorkspaceKeys.all, "documents", workspaceId] as const,
  documentsList: (workspaceId: string, params: GetDocumentsParams) =>
    [...individualWorkspaceKeys.documents(workspaceId), "list", params] as const,
  document: (id: string) => [...individualWorkspaceKeys.all, "document", id] as const,
  ocrResults: (documentId: string) => [...individualWorkspaceKeys.all, "ocr", documentId] as const,
  documentOcr: (documentId: string) => [...individualWorkspaceKeys.all, "document-ocr", documentId] as const,
  processingJobs: (workspaceId: string) => [...individualWorkspaceKeys.all, "jobs", workspaceId] as const,
};

// Hook to fetch workspace details
export function useWorkspaceDetails(workspaceId: string) {
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const setLoading = useWorkspaceStore((state) => state.setLoading);
  const setError = useWorkspaceStore((state) => state.setError);

  return useQuery({
    queryKey: individualWorkspaceKeys.workspace(workspaceId),
    queryFn: async () => {
      setLoading("workspace", true);
      setError("workspace", null);

      try {
        const response = await individualWorkspaceApi.getWorkspaceDetails(workspaceId);

        // Update store
        setWorkspace(response.data);

        return response.data;
      } catch (error: any) {
        console.error("🪝 [useWorkspaceDetails] Error:", error.message);
        setError("workspace", error.message);
        throw error;
      } finally {
        setLoading("workspace", false);
      }
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors or 404s
      if (error?.status === 401 || error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    meta: {
      errorMessage: "Failed to load workspace details",
    },
  });
}

// Hook to fetch workspace documents with pagination and filtering
export function useWorkspaceDocuments(params: GetDocumentsParams) {
  const setDocuments = useWorkspaceStore((state) => state.setDocuments);
  const setLoading = useWorkspaceStore((state) => state.setLoading);
  const setError = useWorkspaceStore((state) => state.setError);

  return useQuery({
    queryKey: individualWorkspaceKeys.documentsList(params.workspaceId, params),
    queryFn: async () => {
      console.log("🪝 [useWorkspaceDocuments] Fetching documents with params:", params);
      setLoading("documents", true);
      setError("documents", null);

      try {
        const response = await individualWorkspaceApi.getWorkspaceDocuments(params);
        console.log("🪝 [useWorkspaceDocuments] Documents fetched:", response.data.data.length);

        // Update store with documents
        setDocuments(response.data.data);

        return response.data;
      } catch (error: any) {
        console.error("🪝 [useWorkspaceDocuments] Error:", error.message);
        setError("documents", error.message);
        throw error;
      } finally {
        setLoading("documents", false);
      }
    },
    enabled: !!params.workspaceId,
    staleTime: 1000 * 30, // 30 seconds
    // Keep showing the current page's data while the next page loads, so
    // pagination metadata (total/totalPages) stays valid during navigation
    // instead of momentarily collapsing to undefined.
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true, // refresh status when the user returns to the tab
    // Adaptive polling: only refetch while a document is still waiting for OCR
    // (mapped from backend UNPROCESSED -> "queued"). Terminal states
    // (completed / failed / PAID+UNPAID -> "processing") stop the polling so we
    // don't hammer the API forever. Also pauses automatically in background tabs.
    refetchInterval: (query) => {
      const docs = query.state.data?.data ?? [];
      const hasPending = docs.some((doc) => doc.status === "queued" || doc.status === "uploading");
      return hasPending ? 5000 : false;
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
    meta: {
      errorMessage: "Failed to load documents",
    },
  });
}

// Hook to fetch individual document details
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: individualWorkspaceKeys.document(documentId),
    queryFn: async () => {
      console.log("🪝 [useDocument] Fetching document:", documentId);
      const response = await individualWorkspaceApi.getDocument(documentId);
      console.log("🪝 [useDocument] Document fetched:", response.data.filename);
      return response.data;
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      errorMessage: "Failed to load document",
    },
  });
}

// Hook to fetch the bundled Document Editor payload (file URL + result + parsed OCR).
// This is the editor's single data source across all editor phases.
export function useDocumentOcr(documentId: string) {
  return useQuery({
    queryKey: individualWorkspaceKeys.documentOcr(documentId),
    queryFn: async () => {
      const response = await individualWorkspaceApi.getDocumentOcr(documentId);
      return response.data;
    },
    enabled: !!documentId,
    // Keep below the presigned file-URL TTL (15 min) so the viewer never gets a
    // stale/expired URL from cache. Don't refetch on focus — that would reload the file.
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    meta: {
      errorMessage: "Failed to load document data",
    },
  });
}

// Hook to fetch OCR results for a document
export function useOCRResults(documentId: string) {
  return useQuery({
    queryKey: individualWorkspaceKeys.ocrResults(documentId),
    queryFn: async () => {
      console.log("🪝 [useOCRResults] Fetching OCR results for:", documentId);
      const response = await individualWorkspaceApi.getOCRResults(documentId);
      console.log("🪝 [useOCRResults] OCR results fetched, confidence:", response.data.confidence);
      return response.data;
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 10, // 10 minutes (OCR results don't change often)
    retry: (failureCount, error: any) => {
      // Don't retry if OCR results don't exist yet
      if (error?.message?.includes("not found")) {
        return false;
      }
      return failureCount < 2;
    },
    meta: {
      errorMessage: "Failed to load OCR results",
    },
  });
}

// Hook to fetch processing jobs for workspace
export function useProcessingJobs(workspaceId: string) {
  const setProcessingJobs = useWorkspaceStore((state) => state.setProcessingJobs);
  const setLoading = useWorkspaceStore((state) => state.setLoading);
  const setError = useWorkspaceStore((state) => state.setError);

  return useQuery({
    queryKey: individualWorkspaceKeys.processingJobs(workspaceId),
    queryFn: async () => {
      console.log("🪝 [useProcessingJobs] Fetching processing jobs for:", workspaceId);
      setLoading("processing", true);
      setError("processing", null);

      try {
        const response = await individualWorkspaceApi.getProcessingJobs(workspaceId);
        console.log("🪝 [useProcessingJobs] Jobs fetched:", response.data.length);

        // Update store
        setProcessingJobs(response.data);

        return response.data;
      } catch (error: any) {
        console.error("🪝 [useProcessingJobs] Error:", error.message);
        setError("processing", error.message);
        throw error;
      } finally {
        setLoading("processing", false);
      }
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 30, // 30 seconds (jobs change frequently)
    refetchInterval: 1000 * 10, // Refetch every 10 seconds for active jobs
    meta: {
      errorMessage: "Failed to load processing jobs",
    },
  });
}

// Hook to upload documents
export function useUploadDocuments() {
  const queryClient = useQueryClient();
  const addDocument = useWorkspaceStore((state) => state.addDocument);
  const setLoading = useWorkspaceStore((state) => state.setLoading);
  const setError = useWorkspaceStore((state) => state.setError);

  return useMutation({
    mutationFn: async (request: UploadDocumentRequest) => {
      console.log("🪝 [useUploadDocuments] Uploading documents:", request.files.length);
      setLoading("upload", true);
      setError("upload", null);

      try {
        const response = await individualWorkspaceApi.uploadDocuments(request);
        console.log("🪝 [useUploadDocuments] Upload completed:", response.data.length);
        return response.data;
      } catch (error: any) {
        console.error("🪝 [useUploadDocuments] Error:", error.message);
        setError("upload", error.message);
        throw error;
      } finally {
        setLoading("upload", false);
      }
    },
    onSuccess: (documents, variables) => {
      console.log("🪝 [useUploadDocuments] Success, updating cache");

      // Add documents to store
      documents.forEach((doc) => addDocument(doc));

      // Invalidate and refetch documents list
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.documents(variables.workspaceId),
      });

      // Invalidate processing jobs if auto-process is enabled
      if (variables.autoProcess) {
        queryClient.invalidateQueries({
          queryKey: individualWorkspaceKeys.processingJobs(variables.workspaceId),
        });
      }

      // Invalidate workspace details to update stats
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.workspace(variables.workspaceId),
      });
    },
    meta: {
      successMessage: "Documents uploaded successfully!",
      errorMessage: "Failed to upload documents",
    },
  });
}

// Hook to delete document
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const removeDocument = useWorkspaceStore((state) => state.removeDocument);

  return useMutation({
    mutationFn: async (documentId: string) => {
      console.log("🪝 [useDeleteDocument] Deleting document:", documentId);
      const response = await individualWorkspaceApi.deleteDocument(documentId);
      console.log("🪝 [useDeleteDocument] Document deleted");
      return { documentId, ...response.data };
    },
    onSuccess: (data) => {
      console.log("🪝 [useDeleteDocument] Success, updating cache");

      // Remove from store
      removeDocument(data.documentId);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.all,
      });
    },
    meta: {
      successMessage: "Document deleted successfully!",
      errorMessage: "Failed to delete document",
    },
  });
}

// Hook to bulk delete documents
export function useBulkDeleteDocuments() {
  const queryClient = useQueryClient();
  const removeDocument = useWorkspaceStore((state) => state.removeDocument);

  return useMutation({
    mutationFn: async (documentIds: string[]) => {
      console.log("🪝 [useBulkDeleteDocuments] Bulk deleting documents:", documentIds.length);
      const response = await individualWorkspaceApi.bulkDeleteDocuments(documentIds);
      console.log("🪝 [useBulkDeleteDocuments] Bulk delete completed:", {
        successful: response.data.totalSuccessful,
        failed: response.data.totalFailed,
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("🪝 [useBulkDeleteDocuments] Success, updating cache");

      // Remove successfully deleted documents from store
      data.successful.forEach((documentId) => {
        removeDocument(documentId);
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.all,
      });
    },
    meta: {
      successMessage: (data: any) => {
        const { totalSuccessful, totalFailed } = data;
        if (totalFailed === 0) {
          return `${totalSuccessful} documents deleted successfully!`;
        } else {
          return `${totalSuccessful} documents deleted, ${totalFailed} failed`;
        }
      },
      errorMessage: "Failed to delete documents",
    },
  });
}

// Hook to delete all workspace documents
export function useDeleteAllWorkspaceDocuments() {
  const queryClient = useQueryClient();
  const setDocuments = useWorkspaceStore((state) => state.setDocuments);

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      console.log("🪝 [useDeleteAllWorkspaceDocuments] Deleting all workspace documents:", workspaceId);
      const response = await individualWorkspaceApi.deleteAllWorkspaceDocuments(workspaceId);
      console.log("🪝 [useDeleteAllWorkspaceDocuments] All documents deleted:", response.data.deletedCount);
      return { workspaceId, ...response.data };
    },
    onSuccess: (data) => {
      console.log("🪝 [useDeleteAllWorkspaceDocuments] Success, updating cache");
      console.log(`Deleted ${data.deletedCount} documents from workspace ${data.workspaceId}`);

      // Clear all documents from store
      setDocuments([]);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.all,
      });
    },
    meta: {
      successMessage: (data: any) => `${data.deletedCount} documents deleted from workspace!`,
      errorMessage: "Failed to delete workspace documents",
    },
  });
}

// Hook to update workspace
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);

  return useMutation({
    mutationFn: async ({ workspaceId, updates }: { workspaceId: string; updates: UpdateWorkspaceRequest }) => {
      console.log("🪝 [useUpdateWorkspace] Updating workspace:", workspaceId, updates);
      const response = await individualWorkspaceApi.updateWorkspace(workspaceId, updates);
      console.log("🪝 [useUpdateWorkspace] Workspace updated");
      return response.data;
    },
    onSuccess: (workspace) => {
      console.log("🪝 [useUpdateWorkspace] Success, updating cache");

      // Update store
      setWorkspace(workspace);

      // Update cache
      queryClient.setQueryData(individualWorkspaceKeys.workspace(workspace.id), workspace);
    },
    meta: {
      successMessage: "Workspace updated successfully!",
      errorMessage: "Failed to update workspace",
    },
  });
}

// Hook to cancel processing job
export function useCancelJob() {
  const queryClient = useQueryClient();
  const updateProcessingJob = useWorkspaceStore((state) => state.updateProcessingJob);

  return useMutation({
    mutationFn: async (jobId: string) => {
      console.log("🪝 [useCancelJob] Cancelling job:", jobId);
      const response = await individualWorkspaceApi.cancelJob(jobId);
      console.log("🪝 [useCancelJob] Job cancelled");
      return { jobId, ...response.data };
    },
    onSuccess: (_, jobId) => {
      console.log("🪝 [useCancelJob] Success, updating cache");

      // Update job status in store
      updateProcessingJob(jobId, { status: "cancelled" });

      // Invalidate processing jobs
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.all,
      });
    },
    meta: {
      successMessage: "Job cancelled successfully!",
      errorMessage: "Failed to cancel job",
    },
  });
}

// Hook to retry failed job
export function useRetryJob() {
  const queryClient = useQueryClient();
  const updateProcessingJob = useWorkspaceStore((state) => state.updateProcessingJob);

  return useMutation({
    mutationFn: async (jobId: string) => {
      console.log("🪝 [useRetryJob] Retrying job:", jobId);
      const response = await individualWorkspaceApi.retryJob(jobId);
      console.log("🪝 [useRetryJob] Job retry initiated");
      return response.data;
    },
    onSuccess: (job) => {
      console.log("🪝 [useRetryJob] Success, updating cache");

      // Update job in store
      updateProcessingJob(job.id, job);

      // Invalidate processing jobs
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.processingJobs(job.workspaceId),
      });
    },
    meta: {
      successMessage: "Job retry initiated successfully!",
      errorMessage: "Failed to retry job",
    },
  });
}

// Hook to reprocess document
export function useReprocessDocument() {
  const queryClient = useQueryClient();
  const updateDocument = useWorkspaceStore((state) => state.updateDocument);
  const addProcessingJob = useWorkspaceStore((state) => state.addProcessingJob);

  return useMutation({
    mutationFn: async (documentId: string) => {
      console.log("🪝 [useReprocessDocument] Reprocessing document:", documentId);
      const response = await individualWorkspaceApi.reprocessDocument(documentId);
      console.log("🪝 [useReprocessDocument] Reprocessing initiated");
      return { documentId, job: response.data };
    },
    onSuccess: (data) => {
      console.log("🪝 [useReprocessDocument] Success, updating cache");

      // Update document status
      updateDocument(data.documentId, {
        status: "queued",
        processingJobId: data.job.id,
      });

      // Add processing job
      addProcessingJob(data.job);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.all,
      });
    },
    meta: {
      successMessage: "Document reprocessing initiated!",
      errorMessage: "Failed to reprocess document",
    },
  });
}

// Hook to export documents
export function useExportDocuments() {
  return useMutation({
    mutationFn: async (request: ExportRequest) => {
      console.log("🪝 [useExportDocuments] Exporting documents:", request.documentIds.length);
      const response = await individualWorkspaceApi.exportDocuments(request);
      console.log("🪝 [useExportDocuments] Export completed");
      return response.data;
    },
    onSuccess: (data) => {
      console.log("🪝 [useExportDocuments] Success, initiating download");

      // In a real app, this would trigger the download
      // For now, we'll just open the download URL
      window.open(data.downloadUrl, "_blank");
    },
    meta: {
      successMessage: "Documents exported successfully!",
      errorMessage: "Failed to export documents",
    },
  });
}

// Hook to update OCR results (for text editing)
export function useUpdateOCRResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, extractedText }: { documentId: string; extractedText: string }) => {
      console.log("🪝 [useUpdateOCRResults] Updating OCR results for:", documentId);
      const response = await individualWorkspaceApi.updateOCRResults(documentId, extractedText);
      console.log("🪝 [useUpdateOCRResults] OCR results updated");
      return response.data;
    },
    onSuccess: (ocrResult) => {
      console.log("🪝 [useUpdateOCRResults] Success, updating cache");

      // Update OCR results cache
      queryClient.setQueryData(individualWorkspaceKeys.ocrResults(ocrResult.documentId), ocrResult);

      // Invalidate document cache to reflect changes
      queryClient.invalidateQueries({
        queryKey: individualWorkspaceKeys.document(ocrResult.documentId),
      });
    },
    meta: {
      successMessage: "OCR results updated successfully!",
      errorMessage: "Failed to update OCR results",
    },
  });
}
// Export additional custom hooks
export { useWorkspaceDataManagement } from "./useWorkspaceDataManagement";
export { useDocumentHandlers } from "./useDocumentHandlers";
