import api from "./api";
import type { ApiResponse } from "./api";

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

// Upload Record Types
export interface CreateUploadRecordRequest {
  key: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  workspaceId?: string;
}

export interface UploadRecordResponse {
  id: string;
  key: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  status: "uploaded" | "processing" | "complete" | "failed";
  uploadedAt: string;
  userId: string;
  workspaceId?: string;
}

// Document Types
export interface CreateDocumentRequest {
  uploadId: string;
  fileName: string;
  documentUrl: string;
  type: "INVOICE" | "RECEIPT" | "CREDIT_NOTE" | "PURCHASE_ORDER" | "BANK_STATEMENT" | "PAYSLIP" | "CONTRACT" | "OTHER";
  workspaceId?: string;
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

  // Create upload record (step 1 of completion)
  createUploadRecord: async (data: CreateUploadRecordRequest): Promise<ApiResponse<UploadRecordResponse>> => {
    console.log("📝 [UploadAPI] Creating upload record:", data);

    const response = await api.post<UploadRecordResponse>("/upload/records", data);

    console.log("📝 [UploadAPI] Upload record created:", {
      uploadId: response.data.id,
      status: response.data.status,
    });

    return response;
  },

  // Create document (step 2 of completion)
  createDocument: async (data: CreateDocumentRequest): Promise<ApiResponse<DocumentResponse>> => {
    console.log("📄 [UploadAPI] Creating document:", data);

    const response = await api.post<DocumentResponse>("/documents", data);

    console.log("📄 [UploadAPI] Document created:", {
      documentId: response.data.id,
      status: response.data.status,
    });

    return response;
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

      // Step 3: Create upload record
      onProgress?.(90);
      const uploadRecordResponse = await uploadApi.createUploadRecord({
        key,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        workspaceId,
      });

      // Step 4: Create document
      onProgress?.(95);

      // Determine document type based on file type
      const getDocumentType = (fileType: string): CreateDocumentRequest["type"] => {
        if (fileType.includes("pdf")) return "OTHER";
        if (fileType.includes("image")) return "RECEIPT";
        return "OTHER";
      };

      const documentResponse = await uploadApi.createDocument({
        uploadId: uploadRecordResponse.data.id,
        fileName: file.name,
        documentUrl: `https://your-bucket.s3.amazonaws.com/${key}`, // You'll need to replace with actual bucket URL
        type: getDocumentType(file.type),
        workspaceId,
      });

      onProgress?.(100);
      return documentResponse.data;
    } catch (error) {
      console.error("📤 [UploadAPI] Upload with progress failed:", error);
      throw error;
    }
  },
};

export default uploadApi;
