import { useState } from 'react';
import { Upload, X, File, Image, FileText, Download } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function FileUpload({ 
  folder = 'general', 
  maxFiles = 10,
  existingFiles = [],
  onFilesChange,
  label = 'Attachments',
  accept = '*'
}) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState(existingFiles || []);
  const [error, setError] = useState('');

  const handleFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));
      formData.append('folder', folder);

      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });

      if (response.ok) {
        const data = await response.json();
        const newFiles = [...files, ...data.files];
        setFiles(newFiles);
        if (onFilesChange) {
          onFilesChange(newFiles);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemoveFile = async (fileUrl, index) => {
    if (!confirm('Are you sure you want to remove this file?')) return;

    try {
      // Delete from cloud storage
      const response = await apiFetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl }),
      });

      if (response.ok) {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        if (onFilesChange) {
          onFilesChange(newFiles);
        }
      } else {
        alert('Failed to delete file');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete file');
    }
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) {
      return <Image className="w-5 h-5" />;
    } else if (mimetype?.includes('pdf')) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-lodha-grey">
        {label}
      </label>

      {/* Upload Button */}
      <div>
        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-lodha-steel rounded-lg cursor-pointer hover:border-lodha-gold hover:bg-lodha-sand/40 transition-colors">
          <Upload className="w-5 h-5 text-lodha-grey/50" />
          <span className="text-sm text-lodha-grey">
            {uploading ? 'Uploading...' : `Choose files (max ${maxFiles})`}
          </span>
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading || files.length >= maxFiles}
            className="hidden"
          />
        </label>
        <p className="text-xs text-lodha-grey/70 mt-1">
          Supported: PDF, Images, Office documents, ZIP (max 50MB per file)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-lodha-grey">
            Uploaded Files ({files.length})
          </p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-lodha-sand/40 border border-lodha-steel/30 rounded-lg p-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file.mimetype)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-lodha-grey truncate">
                      {file.originalName || 'Uploaded file'}
                    </p>
                    {file.size && (
                      <p className="text-xs text-lodha-grey/70">
                        {formatFileSize(file.size)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="View file"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleRemoveFile(file.url, index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
