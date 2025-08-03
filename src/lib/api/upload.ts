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
  fileKey: string;
  fileId: string;
  expiresAt: string;
  fields?: Record<string, string>; // For form data fields if using POST upload
}

export interface UploadToS3Request {
  file: File;
  uploadUrl: string;
  fields?: Record<string, string>;
}

export interface CompleteUploadRequest {
  fileId: string;
  workspaceId: string;
  etag?: string;
}

export interface CompleteUploadResponse {
  document: {
    id: string;
    filename: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    status: "uploaded" | "processing";
    workspaceId: string;
    uploadedBy: string;
  };
}

// Upload API Functions
export const uploadApi = {
  // Generate S3 upload URL
  generateUploadUrl: async (data: GenerateUploadUrlRequest): Promise<ApiResponse<GenerateUploadUrlResponse>> => {
    console.log("🔗 [UploadAPI] Generating upload URL for:", data);

    const response = await api.post<GenerateUploadUrlResponse>("/upload/generate-url", data);

    console.log("🔗 [UploadAPI] Upload URL generated:", {
      fileId: response.data.fileId,
      expiresAt: response.data.expiresAt,
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

  // Complete upload (notify backend)
  completeUpload: async (data: CompleteUploadRequest): Promise<ApiResponse<CompleteUploadResponse>> => {
    console.log("✅ [UploadAPI] Completing upload:", data);

    const response = await api.post<CompleteUploadResponse>("/upload/complete", data);

    console.log("✅ [UploadAPI] Upload completed:", {
      documentId: response.data.document.id,
      status: response.data.document.status,
    });

    return response;
  },

  // Upload file with progress (combines all steps)
  uploadFileWithProgress: async (
    file: File,
    workspaceId: string,
    onProgress?: (progress: number) => void
  ): Promise<CompleteUploadResponse["document"]> => {
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

      const { uploadUrl, fields, fileId } = urlResponse.data;

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

        // Prepare request
        if (fields) {
          // FormData upload
          const formData = new FormData();
          Object.entries(fields).forEach(([key, value]) => {
            formData.append(key, value);
          });
          formData.append("file", file);

          xhr.open("POST", uploadUrl);
          xhr.send(formData);
        } else {
          // Direct PUT upload
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        }
      });

      const { etag } = await uploadPromise;

      // Step 3: Complete upload
      onProgress?.(95);
      const completeResponse = await uploadApi.completeUpload({
        fileId,
        workspaceId,
        etag,
      });

      onProgress?.(100);
      return completeResponse.data.document;
    } catch (error) {
      console.error("📤 [UploadAPI] Upload with progress failed:", error);
      throw error;
    }
  },
};

export default uploadApi;
