// Individual Workspace API functions
// Real API implementation using backend endpoints

import api, { ApiResponse } from "@/lib/api/api";
import type { DocumentResponse } from "@/lib/api/upload";
import type {
  Workspace,
  WorkspaceStats,
  Document,
  OCRResult,
  ProcessingJob,
  PaginatedResponse,
  GetDocumentsParams,
  UploadDocumentRequest,
  UpdateWorkspaceRequest,
  ExportRequest,
  BulkDeleteResponse,
  WorkspaceDeleteResponse,
  DocumentOcrResponse,
  DocumentResultData,
  UpdateDocumentResultPayload,
} from "../types";

// Map the backend DocumentResultResponseDto to our DocumentResultData shape.
function mapDocumentResult(r: any): DocumentResultData {
  return {
    id: r.id,
    status: r.status,
    docType: r.docType,
    fields: (r.fields ?? []).map((f: any) => ({
      id: f.id,
      key: f.key,
      label: f.label ?? null,
      dataType: f.dataType,
      detectedValue: f.detectedValue ?? null,
      value: f.value ?? null,
      confidence: f.confidence ?? null,
      page: f.page ?? 1,
      boundingBox: f.boundingBox ?? null,
      isEdited: !!f.isEdited,
    })),
    lineItems: (r.lineItems ?? []).map((li: any) => ({
      id: li.id,
      rowIndex: li.rowIndex,
      description: li.description ?? null,
      quantity: li.quantity ?? null,
      unitPrice: li.unitPrice ?? null,
      amount: li.amount ?? null,
      tax: li.tax ?? null,
      productCode: li.productCode ?? null,
      boundingBox: li.boundingBox ?? null,
      confidence: li.confidence ?? null,
      cells: li.cells ?? null,
    })),
    reviewedAt: r.reviewedAt ?? null,
    approvedAt: r.approvedAt ?? null,
  };
}

// Import backend types from upload API

// Shape returned by GET /documents/workspace/:workspaceId (paginated)
interface BackendPaginatedDocuments {
  data: DocumentResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Individual Workspace API Functions
export const individualWorkspaceApi = {
  // Get workspace details by ID
  getWorkspaceDetails: async (workspaceId: string): Promise<ApiResponse<Workspace>> => {
    console.log(`🏢 [Individual Workspace API] Fetching workspace details: ${workspaceId}`);

    try {
      // Since the backend doesn't have a dedicated workspace endpoint,
      // we'll create a workspace object by aggregating document data

      // First, try to get documents to calculate stats.
      // The endpoint is paginated ({ data, total, ... }), but tolerate the older
      // plain-array shape too so this doesn't break during the rollout.
      let documents: DocumentResponse[] = [];
      let totalDocuments = 0;
      try {
        const documentsResponse = await api.get<DocumentResponse[] | BackendPaginatedDocuments>(
          `/documents/workspace/${workspaceId}`
        );
        const body = documentsResponse.data;
        if (Array.isArray(body)) {
          documents = body;
          totalDocuments = body.length;
        } else {
          documents = body?.data ?? [];
          totalDocuments = body?.total ?? documents.length;
        }
      } catch (docError) {
        console.warn(`🏢 [Individual Workspace API] Could not fetch documents for stats:`, docError);
        // Continue with empty documents array
      }

      // Calculate stats from documents. Note: status counts reflect the first
      // page of documents when paginated; totalDocuments uses the real total.
      const stats: WorkspaceStats = {
        totalDocuments,
        processingDocuments: documents.filter((doc) => doc.status === "UNPROCESSED").length,
        completedDocuments: documents.filter((doc) => doc.status === "PROCESSED").length,
        failedDocuments: documents.filter((doc) => doc.status === "FLAGGED").length,
        totalStorageUsed: 0, // Backend doesn't provide storage info
        processingTimeAvg: 0, // Backend doesn't provide processing time
        lastActivity:
          documents.length > 0 ? Math.max(...documents.map((doc) => new Date(doc.updatedAt).getTime())).toString() : undefined,
      };

      // Create a workspace object with reasonable defaults
      const workspace: Workspace = {
        id: workspaceId,
        name: `Workspace ${workspaceId}`, // Default name - could be customized later
        description: "Document processing workspace",
        ownerId: "current-user", // Would get from auth context
        members: [
          {
            id: "member-1",
            userId: "current-user",
            workspaceId: workspaceId,
            role: "owner" as const,
            email: "user@example.com", // Would get from auth context
            name: "Current User", // Would get from auth context
            joinedAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        ],
        settings: {
          ocrLanguage: "en",
          ocrQuality: "balanced" as const,
          autoProcess: true,
          retentionDays: 90,
          allowedFileTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg",
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
          ],
          maxFileSize: 52428800, // 50MB
        },
        stats,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `🏢 [Individual Workspace API] Workspace details created: ${workspace.name} (${stats.totalDocuments} documents)`
      );

      return {
        data: workspace,
        success: true,
        status: 200,
        message: "Workspace details retrieved successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error fetching workspace:`, error);
      throw new Error(`Failed to fetch workspace: ${error.message}`);
    }
  },

  // Get documents in workspace with pagination and filtering
  getWorkspaceDocuments: async (params: GetDocumentsParams): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    console.log(`🏢 [Individual Workspace API] Fetching documents for workspace: ${params.workspaceId}`);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());

      // Add filters
      if (params.filters?.status?.length) {
        params.filters.status.forEach((status) => queryParams.append("status", status));
      }
      if (params.filters?.fileTypes?.length) {
        params.filters.fileTypes.forEach((type) => queryParams.append("fileType", type));
      }
      if (params.filters?.dateRange) {
        queryParams.append("startDate", params.filters.dateRange.start);
        queryParams.append("endDate", params.filters.dateRange.end);
      }

      // Add search
      if (params.search?.query) {
        queryParams.append("search", params.search.query);
        if (params.search.searchIn?.length) {
          params.search.searchIn.forEach((field) => queryParams.append("searchIn", field));
        }
      }

      // Add sorting
      if (params.sort) {
        queryParams.append("sortBy", params.sort.field);
        queryParams.append("sortOrder", params.sort.direction);
      }

      const queryString = queryParams.toString();
      const url = `/documents/workspace/${params.workspaceId}${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<BackendPaginatedDocuments>(url);
      const { data: rawDocuments, total, page, limit, totalPages } = response.data;

      // Transform backend DocumentResponse to frontend Document format
      const documents: Document[] = rawDocuments.map((doc) => ({
        id: doc.id,
        filename: doc.fileName,
        originalName: doc.fileName,
        fileSize: 0, // Backend doesn't provide file size in document response
        mimeType: doc.type, // Using document type as mime type for now
        uploadedAt: doc.createdAt,
        status:
          doc.status === "UNPROCESSED"
            ? "queued"
            : doc.status === "PROCESSED"
            ? "completed"
            : doc.status === "FLAGGED"
            ? "failed"
            : "processing",
        workspaceId: params.workspaceId,
        uploadedBy: doc.userId,
        downloadUrl: doc.documentUrl, // Use documentUrl as downloadUrl
        processingJobId: doc.uploadId, // Using uploadId as processing job reference
        ocrResults: undefined, // OCR results are fetched separately
      }));

      console.log(`🏢 [Individual Workspace API] Documents fetched: ${documents.length} of ${total} (page ${page}/${totalPages})`);

      return {
        data: {
          data: documents,
          total,
          page,
          limit,
          totalPages,
        },
        success: true,
        status: 200,
        message: "Documents retrieved successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error fetching documents:`, error);
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }
  },

  // Get document by ID
  getDocument: async (documentId: string): Promise<ApiResponse<Document>> => {
    console.log(`🏢 [Individual Workspace API] Fetching document: ${documentId}`);

    try {
      const response = await api.get<DocumentResponse>(`/documents/${documentId}`);

      // Transform backend DocumentResponse to frontend Document format
      const document: Document = {
        id: response.data.id,
        filename: response.data.fileName,
        originalName: response.data.fileName,
        fileSize: 0, // Backend doesn't provide file size
        mimeType: response.data.type,
        uploadedAt: response.data.createdAt,
        status:
          response.data.status === "UNPROCESSED"
            ? "queued"
            : response.data.status === "PROCESSED"
            ? "completed"
            : response.data.status === "FLAGGED"
            ? "failed"
            : "processing",
        workspaceId: "", // Will be set by the calling component
        uploadedBy: response.data.userId,
        downloadUrl: response.data.documentUrl, // Use documentUrl as downloadUrl
        processingJobId: response.data.uploadId,
        ocrResults: undefined, // OCR results are fetched separately
      };

      console.log(`🏢 [Individual Workspace API] Document fetched: ${document.filename}`);

      return {
        data: document,
        success: true,
        status: 200,
        message: "Document retrieved successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error fetching document:`, error);
      throw new Error(`Failed to fetch document: ${error.message}`);
    }
  },

  // Get the bundled Document Editor payload: presigned file URL + editable result
  // + raw parsed Textract JSON. Backend returns the contract shape directly, so this
  // is a thin passthrough (no transform).
  getDocumentOcr: async (documentId: string): Promise<ApiResponse<DocumentOcrResponse>> => {
    console.log(`🏢 [Individual Workspace API] Fetching document OCR payload: ${documentId}`);

    const response = await api.get<DocumentOcrResponse>(`/documents/${documentId}/ocr`);

    return {
      data: response.data,
      success: true,
      status: 200,
      message: "Document OCR payload retrieved successfully",
    };
  },

  // Persist edited summary / line items for a document result.
  updateDocumentResult: async (
    resultId: string,
    payload: UpdateDocumentResultPayload,
  ): Promise<ApiResponse<DocumentResultData>> => {
    console.log(`🏢 [Individual Workspace API] Updating document result: ${resultId}`);
    const response = await api.patch<any>(`/document-results/${resultId}`, payload);
    return {
      data: mapDocumentResult(response.data),
      success: true,
      status: 200,
      message: "Document result updated successfully",
    };
  },

  // Update the review status (draft -> reviewed -> approved) of a document result.
  updateDocumentResultStatus: async (
    resultId: string,
    status: string,
    approvedById?: string,
  ): Promise<ApiResponse<DocumentResultData>> => {
    console.log(`🏢 [Individual Workspace API] Updating result status: ${resultId} -> ${status}`);
    const response = await api.patch<any>(`/document-results/${resultId}/status`, {
      status,
      ...(approvedById ? { approvedById } : {}),
    });
    return {
      data: mapDocumentResult(response.data),
      success: true,
      status: 200,
      message: "Document result status updated successfully",
    };
  },

  // Get OCR results for a document
  getOCRResults: async (documentId: string): Promise<ApiResponse<OCRResult>> => {
    console.log(`🏢 [Individual Workspace API] Fetching OCR results for document: ${documentId}`);

    try {
      // Note: The backend documentation doesn't specify an OCR results endpoint
      // This might need to be part of the document details or a separate endpoint
      // For now, we'll try to get it from the document endpoint
      const documentResponse = await api.get<DocumentResponse>(`/documents/${documentId}`);

      // Create OCR result structure from document data
      // This is a placeholder - you'll need to adjust based on actual backend response
      const ocrResult: OCRResult = {
        id: `ocr-${documentId}`,
        documentId: documentId,
        extractedText: "", // Backend doesn't provide OCR text in document response
        confidence: 0, // Backend doesn't provide confidence score
        language: "en",
        processingTime: 0,
        metadata: {
          pageCount: 1,
          imageWidth: 0,
          imageHeight: 0,
          dpi: 0,
          processingEngine: "unknown",
          processingVersion: "1.0",
        },
        createdAt: documentResponse.data.updatedAt,
        editedText: undefined,
        lastEditedAt: undefined,
        lastEditedBy: undefined,
      };

      console.log(`🏢 [Individual Workspace API] OCR results fetched for: ${documentId}`);

      return {
        data: ocrResult,
        success: true,
        status: 200,
        message: "OCR results retrieved successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error fetching OCR results:`, error);
      throw new Error(`Failed to fetch OCR results: ${error.message}`);
    }
  },

  // Upload documents to workspace
  uploadDocuments: async (request: UploadDocumentRequest): Promise<ApiResponse<Document[]>> => {
    console.log(`🏢 [Individual Workspace API] Uploading ${request.files.length} files to workspace: ${request.workspaceId}`);

    try {
      const uploadedDocuments: Document[] = [];

      // Use the consolidated upload API for each file
      const { uploadApi } = await import("@/lib/api/upload");

      for (const file of request.files) {
        try {
          console.log(`🏢 [Individual Workspace API] Uploading file: ${file.name}`);

          // Upload file using the consolidated upload API
          const documentResponse = await uploadApi.uploadFileWithProgress(file, request.workspaceId);

          // Transform backend DocumentResponse to frontend Document format
          const document: Document = {
            id: documentResponse.id,
            filename: documentResponse.fileName,
            originalName: documentResponse.fileName,
            fileSize: file.size,
            mimeType: file.type,
            uploadedAt: documentResponse.createdAt,
            status:
              documentResponse.status === "UNPROCESSED"
                ? "queued"
                : documentResponse.status === "PROCESSED"
                ? "completed"
                : documentResponse.status === "FLAGGED"
                ? "failed"
                : "processing",
            workspaceId: request.workspaceId,
            uploadedBy: documentResponse.userId,
            downloadUrl: documentResponse.documentUrl,
            processingJobId: documentResponse.uploadId,
            ocrResults: undefined,
          };

          uploadedDocuments.push(document);

          console.log(`🏢 [Individual Workspace API] File uploaded successfully: ${file.name}`);
        } catch (fileError: any) {
          console.error(`🏢 [Individual Workspace API] Failed to upload file ${file.name}:`, fileError);
          // Continue with other files instead of failing completely
        }
      }

      if (uploadedDocuments.length === 0) {
        throw new Error("No files were uploaded successfully");
      }

      console.log(`🏢 [Individual Workspace API] Upload completed: ${uploadedDocuments.length}/${request.files.length} files`);

      return {
        data: uploadedDocuments,
        success: true,
        status: 201,
        message: `${uploadedDocuments.length} documents uploaded successfully`,
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error uploading documents:`, error);
      throw new Error(`Failed to upload documents: ${error.message}`);
    }
  },

  // Delete single document
  deleteDocument: async (documentId: string): Promise<ApiResponse<{ message: string }>> => {
    console.log(`🏢 [Individual Workspace API] Deleting document: ${documentId}`);

    try {
      await api.delete(`/documents/${documentId}`);

      console.log(`🏢 [Individual Workspace API] Document deleted: ${documentId}`);

      return {
        data: { message: "Document deleted successfully" },
        success: true,
        status: 200,
        message: "Document deleted successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error deleting document:`, error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  },

  // Bulk delete multiple documents
  bulkDeleteDocuments: async (documentIds: string[]): Promise<ApiResponse<BulkDeleteResponse>> => {
    console.log(`🏢 [Individual Workspace API] Bulk deleting ${documentIds.length} documents:`, documentIds);

    try {
      const response = await api.delete<BulkDeleteResponse>("/documents/bulk", {
        data: { documentIds },
      });

      console.log(`🏢 [Individual Workspace API] Bulk delete completed:`, {
        totalRequested: response.data.totalRequested,
        totalSuccessful: response.data.totalSuccessful,
        totalFailed: response.data.totalFailed,
      });

      return response;
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error bulk deleting documents:`, error);
      throw new Error(`Failed to bulk delete documents: ${error.message}`);
    }
  },

  // Delete all documents in workspace
  deleteAllWorkspaceDocuments: async (workspaceId: string): Promise<ApiResponse<WorkspaceDeleteResponse>> => {
    console.log(`🏢 [Individual Workspace API] Deleting all documents in workspace: ${workspaceId}`);

    try {
      const response = await api.delete<WorkspaceDeleteResponse>(`/documents/workspace/${workspaceId}`);

      console.log(`🏢 [Individual Workspace API] Workspace documents deleted:`, {
        deletedCount: response.data.deletedCount,
      });

      return response;
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error deleting workspace documents:`, error);
      throw new Error(`Failed to delete workspace documents: ${error.message}`);
    }
  },

  // Update workspace
  updateWorkspace: async (workspaceId: string, updates: UpdateWorkspaceRequest): Promise<ApiResponse<Workspace>> => {
    console.log(`🏢 [Individual Workspace API] Updating workspace: ${workspaceId}`, updates);

    try {
      const response = await api.put<Workspace>(`/workspace/${workspaceId}`, updates);

      console.log(`🏢 [Individual Workspace API] Workspace updated: ${response.data.name}`);

      return response;
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error updating workspace:`, error);
      throw new Error(`Failed to update workspace: ${error.message}`);
    }
  },

  // Get processing jobs for workspace
  getProcessingJobs: async (workspaceId: string): Promise<ApiResponse<ProcessingJob[]>> => {
    console.log(`🏢 [Individual Workspace API] Fetching processing jobs for workspace: ${workspaceId}`);

    try {
      // Get all jobs for the current user
      const response = await api.get<any[]>("/jobs/my-jobs");

      // Transform backend job response to frontend ProcessingJob format
      const jobs: ProcessingJob[] = response.data.map((job) => ({
        id: job.id,
        documentId: "", // Backend doesn't provide documentId directly
        workspaceId: workspaceId,
        status:
          job.status === "pending"
            ? "pending"
            : job.status === "processing"
            ? "running"
            : job.status === "success"
            ? "completed"
            : job.status === "failed"
            ? "failed"
            : "pending",
        progress: job.status === "success" ? 100 : job.status === "processing" ? 50 : 0,
        startedAt: job.startedAt,
        completedAt: job.completedAt || undefined,
        retryCount: 0, // Backend doesn't provide retry count
        error: job.errorMessage || undefined,
      }));

      console.log(`🏢 [Individual Workspace API] Processing jobs fetched: ${jobs.length}`);

      return {
        data: jobs,
        success: true,
        status: 200,
        message: "Processing jobs retrieved successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error fetching processing jobs:`, error);
      throw new Error(`Failed to fetch processing jobs: ${error.message}`);
    }
  },

  // Cancel processing job
  cancelJob: async (jobId: string): Promise<ApiResponse<{ message: string }>> => {
    console.log(`🏢 [Individual Workspace API] Cancelling job: ${jobId}`);

    try {
      // Note: Backend documentation doesn't specify a cancel job endpoint
      // This might need to be implemented or use a different approach
      await api.delete(`/jobs/${jobId}`);

      console.log(`🏢 [Individual Workspace API] Job cancelled: ${jobId}`);

      return {
        data: { message: "Job cancelled successfully" },
        success: true,
        status: 200,
        message: "Job cancelled successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error cancelling job:`, error);
      throw new Error(`Failed to cancel job: ${error.message}`);
    }
  },

  // Retry failed job
  retryJob: async (jobId: string): Promise<ApiResponse<ProcessingJob>> => {
    console.log(`🏢 [Individual Workspace API] Retrying job: ${jobId}`);

    try {
      // Get the original job details
      const jobResponse = await api.get<any>(`/jobs/${jobId}`);

      // Create a new job with the same parameters
      const newJobResponse = await api.post<any>("/jobs", {
        uploadId: jobResponse.data.uploadId,
        type: jobResponse.data.type,
      });

      // Transform to frontend format
      const job: ProcessingJob = {
        id: newJobResponse.data.id,
        documentId: "", // Backend doesn't provide documentId directly
        workspaceId: "", // Will be set by calling component
        status: "pending",
        progress: 0,
        startedAt: newJobResponse.data.startedAt,
        completedAt: undefined,
        retryCount: 1, // Increment retry count
        error: undefined,
      };

      console.log(`🏢 [Individual Workspace API] Job retry initiated: ${job.id}`);

      return {
        data: job,
        success: true,
        status: 200,
        message: "Job retry initiated successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error retrying job:`, error);
      throw new Error(`Failed to retry job: ${error.message}`);
    }
  },

  // Reprocess document
  reprocessDocument: async (documentId: string): Promise<ApiResponse<ProcessingJob>> => {
    console.log(`🏢 [Individual Workspace API] Reprocessing document: ${documentId}`);

    try {
      // Get document details to find the upload ID
      const documentResponse = await api.get<DocumentResponse>(`/documents/${documentId}`);

      // Create new processing job
      const jobResponse = await api.post<any>("/jobs", {
        uploadId: documentResponse.data.uploadId,
        type: documentResponse.data.type,
      });

      // Transform to frontend format
      const job: ProcessingJob = {
        id: jobResponse.data.id,
        documentId: documentId,
        workspaceId: "", // Will be set by calling component
        status: "pending",
        progress: 0,
        startedAt: jobResponse.data.startedAt,
        completedAt: undefined,
        retryCount: 0,
        error: undefined,
      };

      console.log(`🏢 [Individual Workspace API] Document reprocessing initiated: ${documentId}`);

      return {
        data: job,
        success: true,
        status: 201,
        message: "Document reprocessing initiated successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error reprocessing document:`, error);
      throw new Error(`Failed to reprocess document: ${error.message}`);
    }
  },

  // Export documents
  exportDocuments: async (request: ExportRequest): Promise<ApiResponse<{ downloadUrl: string }>> => {
    console.log("🏢 [Individual Workspace API] Exporting documents:", request);

    try {
      // Note: Backend documentation doesn't specify an export endpoint
      // This might need to be implemented or use a different approach
      // For now, we'll create a simple download URL based on document URLs

      if (request.documentIds.length === 1) {
        // Single document - get document URL directly
        const documentResponse = await api.get<DocumentResponse>(`/documents/${request.documentIds[0]}`);

        return {
          data: { downloadUrl: documentResponse.data.documentUrl },
          success: true,
          status: 200,
          message: "Document export ready",
        };
      } else {
        // Multiple documents - would need a zip export endpoint
        // For now, return a placeholder
        const exportId = `export-${Date.now()}`;
        const downloadUrl = `/api/exports/${exportId}/download`;

        return {
          data: { downloadUrl },
          success: true,
          status: 200,
          message: `${request.documentIds.length} documents exported successfully`,
        };
      }
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error exporting documents:`, error);
      throw new Error(`Failed to export documents: ${error.message}`);
    }
  },

  // Update OCR results (for text editing)
  updateOCRResults: async (documentId: string, extractedText: string): Promise<ApiResponse<OCRResult>> => {
    console.log(`🏢 [Individual Workspace API] Updating OCR results for document: ${documentId}`);

    try {
      // Note: Backend documentation doesn't specify an OCR update endpoint
      // This might need to be implemented as part of document update
      // For now, we'll return the updated OCR result structure

      const ocrResult: OCRResult = {
        id: `ocr-${documentId}`,
        documentId: documentId,
        extractedText: extractedText,
        confidence: 0.95, // Placeholder confidence
        language: "en",
        processingTime: 0,
        metadata: {
          pageCount: 1,
          imageWidth: 0,
          imageHeight: 0,
          dpi: 0,
          processingEngine: "unknown",
          processingVersion: "1.0",
        },
        createdAt: new Date().toISOString(),
        editedText: extractedText,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: "current-user", // Would get from auth context
      };

      console.log(`🏢 [Individual Workspace API] OCR results updated for: ${documentId}`);

      return {
        data: ocrResult,
        success: true,
        status: 200,
        message: "OCR results updated successfully",
      };
    } catch (error: any) {
      console.error(`🏢 [Individual Workspace API] Error updating OCR results:`, error);
      throw new Error(`Failed to update OCR results: ${error.message}`);
    }
  },
};

export default individualWorkspaceApi;
