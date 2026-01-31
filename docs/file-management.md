# File Management System Documentation

## Overview
The file management system provides secure cloud storage integration using Google Cloud Storage (GCS) for all file uploads in the Atelier MEP project management system.

## Architecture

### Backend Components

#### 1. Storage Module (`server/storage.js`)
- **Purpose**: Handles all interactions with Google Cloud Storage
- **Key Functions**:
  - `uploadToGCS(fileBuffer, originalName, mimetype, folder)` - Uploads files to GCS
  - `deleteFromGCS(fileUrl)` - Deletes files from GCS
  - `isStorageConfigured()` - Checks if storage is available

#### 2. File Upload Endpoints (`server/index.js`)
- **POST /api/upload** - Upload multiple files (max 10, 50MB each)
  - Supports: Images, PDFs, Office docs, ZIP files
  - Returns: Array of file objects with URLs
  
- **DELETE /api/upload** - Delete a file from storage
  - Requires: fileUrl in request body
  
- **GET /api/upload/status** - Check if storage is configured

### Frontend Components

#### FileUpload Component (`src/components/FileUpload.jsx`)
Reusable file upload component with:
- Drag-and-drop style interface
- Multiple file support (configurable max)
- File preview with icons
- Download and delete capabilities
- Progress indication
- Error handling

**Props**:
- `folder`: Storage folder (e.g., 'mas', 'rfi', 'drawings')
- `maxFiles`: Maximum files allowed (default: 10)
- `existingFiles`: Array of existing file objects
- `onFilesChange`: Callback when files change
- `label`: Label for the upload section
- `accept`: File type filter

## Configuration

### Environment Variables

Required for production:

```bash
# Google Cloud Storage Configuration
GCS_BUCKET_NAME=atelier-mep-files
GCP_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Development Setup

1. **Create GCS Bucket**:
   ```bash
   gsutil mb -p your-project-id gs://atelier-mep-files
   gsutil iam ch allUsers:objectViewer gs://atelier-mep-files
   ```

2. **Create Service Account**:
   - Go to Google Cloud Console
   - Create service account with "Storage Object Admin" role
   - Download JSON key
   - Set as environment variable or GOOGLE_APPLICATION_CREDENTIALS

3. **Install Dependencies**:
   ```bash
   npm install @google-cloud/storage multer uuid
   ```

## Usage Examples

### In a React Component

```jsx
import FileUpload from '../components/FileUpload';

function MyForm() {
  const [attachments, setAttachments] = useState([]);

  const handleSubmit = async () => {
    const response = await fetch('/api/my-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // ... other data
        attachmentUrls: attachments.map(file => file.url),
      }),
    });
  };

  return (
    <FileUpload
      folder="my-folder"
      maxFiles={5}
      existingFiles={attachments}
      onFilesChange={setAttachments}
      label="Upload Documents"
    />
  );
}
```

### Storing File References

Files are stored as JSONB arrays in PostgreSQL:

```sql
CREATE TABLE my_table (
  id SERIAL PRIMARY KEY,
  attachment_urls JSONB,
  ...
);
```

Store file URLs:
```javascript
const fileUrls = attachments.map(file => file.url);
await query(
  'INSERT INTO my_table (attachment_urls) VALUES ($1)',
  [JSON.stringify(fileUrls)]
);
```

## Folder Structure

Recommended folder organization in GCS:

```
atelier-mep-files/
├── mas/           # Material Approval Sheets
├── rfi/           # Requests for Information
├── drawings/      # Drawing schedules
├── changes/       # Change requests
└── general/       # Miscellaneous files
```

## Security

### Access Control
- All uploads require authentication (verifyToken middleware)
- Files are made public after upload for easy access
- File URLs include unique UUIDs to prevent guessing

### File Validation
- File type validation via MIME type
- File size limit: 50MB per file
- Maximum 10 files per upload request

### Allowed File Types
- Images: JPEG, PNG, GIF
- Documents: PDF, Word, Excel, PowerPoint
- Archives: ZIP
- Text: Plain text

## File Object Structure

```javascript
{
  url: "https://storage.googleapis.com/bucket/folder/uuid.pdf",
  originalName: "document.pdf",
  size: 1024567,  // bytes
  mimetype: "application/pdf"
}
```

## Error Handling

### Backend Errors
- `503 Service Unavailable` - Storage not configured
- `400 Bad Request` - No files or invalid file URL
- `500 Internal Server Error` - Upload/delete failed

### Frontend Errors
- File count exceeded
- File type not allowed
- Upload failed
- Delete failed

## Integration Status

### ✅ Completed
- Backend storage module
- File upload endpoints
- FileUpload component
- MAS Form integration

### 🔄 Pending
- RFI form integration
- Drawing Schedule integration
- Change Request integration
- MAS Detail page file display
- RFI Detail page file display

## Performance Considerations

### File Size Optimization
- Compress images before upload when possible
- Use appropriate image formats (JPEG for photos, PNG for graphics)
- Consider PDF compression for large documents

### Caching
- Files are served directly from GCS with CDN caching
- Public URLs enable browser caching

### Cleanup
- Implement periodic cleanup of orphaned files
- Delete files when parent records are deleted

## Troubleshooting

### "Storage not configured" Error
- Check GCP_SERVICE_ACCOUNT environment variable
- Verify service account has correct permissions
- Ensure bucket exists and is accessible

### Upload Fails
- Check file size (< 50MB)
- Verify file type is allowed
- Check network connectivity
- Review server logs for detailed errors

### Files Not Visible
- Verify bucket permissions (allUsers:objectViewer)
- Check file URL format
- Ensure files were made public after upload

## Future Enhancements

1. **Private File Support**: Option for private files with signed URLs
2. **Image Thumbnails**: Automatic thumbnail generation for images
3. **File Versioning**: Track file versions and history
4. **Bulk Operations**: Upload multiple files at once with progress tracking
5. **File Preview**: In-app preview for images and PDFs
6. **Storage Quotas**: Per-project storage limits
7. **Audit Trail**: Track who uploaded/deleted files
