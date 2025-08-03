# S3 Upload Implementation

## 🚀 **Overview**

This implementation provides a complete S3 upload solution that integrates with your backend to get signed upload URLs and handles the entire upload process with progress tracking.

## 📋 **Implementation Components**

### **1. Upload API (`src/lib/api/upload.ts`)**

**Endpoints:**

- `POST /upload/generate-url` - Get S3 upload URL and metadata
- `POST /upload/complete` - Notify backend when upload is complete

**Key Features:**

- ✅ **Signed URL Generation**: Gets secure upload URLs from backend
- ✅ **Direct S3 Upload**: Uploads files directly to S3 (no server proxy)
- ✅ **Progress Tracking**: Real-time upload progress with XMLHttpRequest
- ✅ **Error Handling**: Comprehensive error handling and retry logic
- ✅ **Flexible Upload Methods**: Supports both PUT and POST uploads

### **2. S3 Upload Hook (`src/lib/hooks/useS3Upload.ts`)**

**Features:**

- ✅ **Progress Management**: Tracks upload progress for multiple files
- ✅ **State Management**: Manages upload states (pending, uploading, completed, error)
- ✅ **Batch Uploads**: Handle multiple file uploads simultaneously
- ✅ **Event Callbacks**: Customizable success/error/progress callbacks
- ✅ **Cleanup Functions**: Clear completed/failed uploads

### **3. Enhanced UploadZone (`src/components/App/IndividualWorkspace/ui/UploadZone.tsx`)**

**Updates:**

- ✅ **S3 Integration**: Uses new S3 upload system instead of direct backend upload
- ✅ **Real-time Progress**: Shows detailed progress for each file
- ✅ **Better UX**: Enhanced progress indicators and status messages
- ✅ **Error Handling**: Improved error display and recovery

## 🔄 **Upload Flow**

### **Step 1: Generate Upload URL**

```typescript
// Request to your backend
POST /api/upload/generate-url
{
  "fileName": "invoice.pdf",
  "fileType": "application/pdf",
  "fileSize": 104857,
  "workspaceId": "76258c32-4d3a-4b09-b0b1-1be24de66870"
}

// Response from backend
{
  "uploadUrl": "https://your-bucket.s3.amazonaws.com/...",
  "fileKey": "uploads/workspace-id/file-id.pdf",
  "fileId": "unique-file-id",
  "expiresAt": "2024-01-20T15:30:00Z",
  "fields": { /* optional form fields for POST upload */ }
}
```

### **Step 2: Upload to S3**

```typescript
// Direct upload to S3 with progress tracking
PUT/POST to uploadUrl
- File data
- Progress callbacks
- Error handling
```

### **Step 3: Complete Upload**

```typescript
// Notify backend of successful upload
POST /api/upload/complete
{
  "fileId": "unique-file-id",
  "workspaceId": "76258c32-4d3a-4b09-b0b1-1be24de66870",
  "etag": "optional-s3-etag"
}

// Backend creates document record and starts processing
```

## 🛠️ **Backend Requirements**

### **1. Generate Upload URL Endpoint**

```typescript
// POST /api/upload/generate-url
interface GenerateUploadUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  workspaceId: string;
}

interface GenerateUploadUrlResponse {
  uploadUrl: string; // Signed S3 URL
  fileKey: string; // S3 object key
  fileId: string; // Unique identifier for tracking
  expiresAt: string; // URL expiration time
  fields?: Record<string, string>; // Optional form fields
}
```

### **2. Complete Upload Endpoint**

```typescript
// POST /api/upload/complete
interface CompleteUploadRequest {
  fileId: string;
  workspaceId: string;
  etag?: string;
}

interface CompleteUploadResponse {
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
```

## 📊 **Usage Examples**

### **Basic Usage**

```typescript
import { useS3Upload } from "@/lib/hooks/useS3Upload";

function MyUploadComponent() {
  const { uploadFile, uploadProgress, isUploading } = useS3Upload({
    workspaceId: "your-workspace-id",
    onUploadComplete: (document) => {
      console.log("Upload completed:", document);
    },
    onUploadError: (error, fileName) => {
      console.error("Upload failed:", error, fileName);
    },
  });

  const handleFileSelect = async (file: File) => {
    await uploadFile(file);
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      {uploadProgress.map((progress) => (
        <div key={progress.fileId}>
          {progress.fileName}: {progress.progress}%
        </div>
      ))}
    </div>
  );
}
```

### **Advanced Usage with Progress**

```typescript
const { uploadFileWithProgress } = uploadApi;

const uploadWithCustomProgress = async (file: File) => {
  try {
    const document = await uploadFileWithProgress(file, workspaceId, (progress) => {
      console.log(`Upload progress: ${progress}%`);
      // Update your UI here
    });
    console.log("Upload completed:", document);
  } catch (error) {
    console.error("Upload failed:", error);
  }
};
```

## 🔒 **Security Considerations**

### **1. Signed URLs**

- ✅ URLs are signed by your backend with limited expiration time
- ✅ Users can only upload to specific S3 paths
- ✅ File size and type restrictions enforced

### **2. Validation**

- ✅ Frontend validates file types and sizes before upload
- ✅ Backend should validate again when generating URLs
- ✅ S3 bucket policies should restrict access

### **3. Authentication**

- ✅ All API calls use existing authentication system
- ✅ Workspace access is validated before generating URLs

## 🎯 **Benefits**

### **1. Performance**

- **Direct S3 Upload**: Files go directly to S3, not through your server
- **Parallel Uploads**: Multiple files can upload simultaneously
- **Progress Tracking**: Real-time progress feedback

### **2. Scalability**

- **Reduced Server Load**: Your server only generates URLs, doesn't handle file data
- **S3 Reliability**: Leverages AWS S3's reliability and speed
- **Global CDN**: S3 provides global distribution

### **3. User Experience**

- **Real-time Progress**: Users see detailed upload progress
- **Error Recovery**: Clear error messages and retry capabilities
- **Batch Operations**: Handle multiple files efficiently

## 🔧 **Configuration Options**

### **Upload Limits**

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;
const ALLOWED_FILE_TYPES = {
  "application/pdf": { icon: FileText, label: "PDF" },
  "image/jpeg": { icon: Image, label: "JPEG" },
  "image/png": { icon: Image, label: "PNG" },
};
```

### **Progress Tracking**

```typescript
// Progress is reported in steps:
// 10% - URL generated
// 20-90% - Upload progress
// 95% - Upload complete notification
// 100% - Backend processing started
```

## 🧪 **Testing**

### **1. Test Upload Flow**

```javascript
// In browser console:
import { uploadApi } from "@/lib/api/upload";

// Test URL generation
const urlResponse = await uploadApi.generateUploadUrl({
  fileName: "test.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  workspaceId: "test-workspace",
});

console.log("Upload URL:", urlResponse.data);
```

### **2. Test Progress Tracking**

```javascript
// Upload with progress
const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
const document = await uploadApi.uploadFileWithProgress(file, "test-workspace", (progress) =>
  console.log(`Progress: ${progress}%`)
);
```

This implementation provides a robust, scalable, and user-friendly file upload system that integrates seamlessly with your existing architecture!
