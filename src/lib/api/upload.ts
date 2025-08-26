import api from "./api";
import type { ApiResponse } from "./api";
import { getS3DocumentUrl } from "@/lib/utils/s3";

// Upload Types
export interface GenerateUploadUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  workspaceId: string;
}

export interface GenerateUploadUrlResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
  maxFileSize: number;
}

export interface UploadToS3Request {
  file: File;
  uploadUrl: string;
  fields?: Record<string, string>;
}

export interface DocumentResponse {
  id: string;
  fileName: string;
  documentUrl: string;
  type: string;
  status: "UNPROCESSED" | "PROCESSED" | "PAID" | "UNPAID" | "FLAGGED";
  uploadId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Consolidated Upload Types
export interface ProcessUploadRequest {
  fileName: string;
  s3Key: string;
  fileType: string;
  userId: string;
  workspaceId: string;
  documentType: "INVOICE" | "RECEIPT" | "CREDIT_NOTE" | "PURCHASE_ORDER" | "BANK_STATEMENT" | "PAYSLIP" | "CONTRACT" | "OTHER";
  fileSize: number;
}

export interface ProcessUploadResponse {
  uploadId: string;
  documentId: string;
  jobId: string;
  sqsMessageId: string;
  status: "success" | "error";
}

// Error handling types for consolidated endpoint
export interface ProcessUploadError {
  step: "job" | "workspace_association" | "sqs_trigger";
  message: string;
  details?: any;
}

// Upload API Functions
export const uploadApi = {
  // Generate S3 upload URL
  generateUploadUrl: async (data: GenerateUploadUrlRequest): Promise<ApiResponse<GenerateUploadUrlResponse>> => {
    console.log("🔗 [UploadAPI] Generating upload URL for:", data);

    const response = await api.post<GenerateUploadUrlResponse>("/upload/generate-url", data);

    console.log("🔗 [UploadAPI] Upload URL generated:", {
      key: response.data.key,
      expiresIn: response.data.expiresIn,
    });

    return response;
  },

  // Upload file directly to S3
  uploadToS3: async ({ file, uploadUrl, fields }: UploadToS3Request): Promise<{ etag?: string }> => {
    console.log("☁️ [UploadAPI] Uploading to S3:", {
      fileName: file.name,
      fileSize: file.size,
      uploadUrl: uploadUrl.split("?")[0], // Log URL without query params for security
    });

    try {
      let response: Response;

      if (fields) {
        // Use FormData for POST upload (with fields)
        const formData = new FormData();

        // Add all the fields first
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });

        // Add the file last
        formData.append("file", file);

        response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });
      } else {
        // Use PUT upload (direct to S3)
        response = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });
      }

      if (!response.ok) {
        throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
      }

      console.log("☁️ [UploadAPI] S3 upload successful");

      // Extract ETag from response headers if available
      const etag = response.headers.get("ETag")?.replace(/"/g, "");

      return { etag };
    } catch (error) {
      console.error("☁️ [UploadAPI] S3 upload failed:", error);
      throw error;
    }
  },

  // Process upload (consolidated endpoint)
  processUpload: async (data: ProcessUploadRequest): Promise<ApiResponse<ProcessUploadResponse>> => {
    console.log("🔄 [UploadAPI] Processing upload with consolidated endpoint:", {
      fileName: data.fileName,
      s3Key: data.s3Key,
      fileType: data.fileType,
      userId: data.userId,
      workspaceId: data.workspaceId,
      documentType: data.documentType,
      fileSize: data.fileSize,
    });

    try {
      const response = await api.post<ProcessUploadResponse>("/upload/process", data);

      console.log("🔄 [UploadAPI] Upload processed successfully:", {
        uploadId: response.data.uploadId,
        documentId: response.data.documentId,
        jobId: response.data.jobId,
        sqsMessageId: response.data.sqsMessageId,
        status: response.data.status,
      });

      return response;
    } catch (error) {
      console.error("🔄 [UploadAPI] Upload processing failed:", error);

      // Enhanced error logging for the consolidated endpoint
      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as any;
        if (apiError.response?.data) {
          console.error("🔄 [UploadAPI] Server error details:", apiError.response.data);
        }
      }

      throw error;
    }
  },

  // Upload file with progress (combines all steps)
  uploadFileWithProgress: async (
    file: File,
    workspaceId: string,
    onProgress?: (progress: number) => void
  ): Promise<DocumentResponse> => {
    try {
      // Step 1: Generate upload URL
      onProgress?.(10);
      const urlResponse = await uploadApi.generateUploadUrl({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        workspaceId,
      });

      // Step 2: Upload to S3 with progress tracking
      onProgress?.(20);

      const { uploadUrl, key } = urlResponse.data;

      // Create a custom upload with progress tracking
      const uploadPromise = new Promise<{ etag?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            // Progress from 20% to 90% during upload
            const uploadProgress = 20 + (event.loaded / event.total) * 70;
            onProgress?.(Math.round(uploadProgress));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader("ETag")?.replace(/"/g, "");
            resolve({ etag });
          } else {
            reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("S3 upload failed: Network error"));
        });

        // Direct PUT upload (based on backend docs)
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      await uploadPromise;

      // Step 3: Process upload using consolidated endpoint
      onProgress?.(90);

      // Get current user ID from auth store
      const { useAuthStore } = await import("@/lib/auth/authStore");
      const user = useAuthStore.getState().user;

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Determine document type based on file type
      const getDocumentType = (fileType: string): ProcessUploadRequest["documentType"] => {
        // if (fileType.includes("pdf")) return "OTHER";
        // if (fileType.includes("image")) return "RECEIPT";
        console.log(fileType)
        return "INVOICE";
      };

      const processResponse = await uploadApi.processUpload({
        fileName: file.name,
        s3Key: key,
        fileType: file.type,
        userId: user.id,
        workspaceId,
        documentType: getDocumentType(file.type),
        fileSize: file.size,
      });

      onProgress?.(100);

      // Construct DocumentResponse from ProcessUploadResponse and file data
      const documentResponse: DocumentResponse = {
        id: processResponse.data.documentId,
        fileName: file.name,
        documentUrl: getS3DocumentUrl(key),
        type: getDocumentType(file.type),
        status: "UNPROCESSED",
        uploadId: processResponse.data.uploadId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return documentResponse;
    } catch (error) {
      console.error("📤 [UploadAPI] Upload with progress failed:", error);
      throw error;
    }
  },
};

export default uploadApi;
