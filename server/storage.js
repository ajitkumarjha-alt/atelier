import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Cloud Storage
let storage = null;
let bucket = null;

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'atelier-mep-files';

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_SERVICE_ACCOUNT) {
    let credentials;
    
    if (process.env.GCP_SERVICE_ACCOUNT) {
      // Production: Parse from environment variable
      credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT);
    }
    
    storage = new Storage(credentials ? { credentials } : {});
    bucket = storage.bucket(BUCKET_NAME);
    console.log(`✅ Google Cloud Storage initialized (bucket: ${BUCKET_NAME})`);
  } else {
    console.warn('⚠️  Google Cloud Storage not configured. Using local file storage for development.');
  }
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error.message);
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory for local file storage');
}

// Configure multer for disk or memory storage
const multerStorage = storage && bucket ? multer.memoryStorage() : multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || 'documents';
    const destPath = path.join(uploadsDir, folder);
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow common file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

export const upload = multer({
  storage: multerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

/**
 * Upload file to Google Cloud Storage or local storage
 * @param {Object} file - File object from multer (has buffer for GCS, path for local)
 * @param {string} originalName - Original file name
 * @param {string} mimetype - File MIME type
 * @param {string} folder - Folder path in bucket (e.g., 'mas', 'rfi', 'drawings')
 * @returns {Promise<string>} - Public URL or local path of uploaded file
 */
export async function uploadToGCS(file, originalName = null, mimetype = null, folder = 'general') {
  // If using local storage
  if (!storage || !bucket) {
    // File is already saved by multer diskStorage
    if (file.path) {
      // Return relative path from uploads directory
      const relativePath = path.relative(path.join(__dirname, '../uploads'), file.path);
      return `/uploads/${relativePath.replace(/\\/g, '/')}`;
    }
    throw new Error('File storage failed');
  }

  // Use Google Cloud Storage
  try {
    const fileBuffer = file.buffer;
    const fileName = originalName || file.originalname;
    const mimeType = mimetype || file.mimetype;
    
    // Generate unique filename
    const ext = path.extname(fileName);
    const filename = `${uuidv4()}${ext}`;
    const filePath = `${folder}/${filename}`;

    // Create a new blob in the bucket
    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('Upload error:', error);
        reject(error);
      });

      blobStream.on('finish', async () => {
        try {
          // Make the file public
          await blob.makePublic();
          
          // Get public URL
          const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
          
          resolve(publicUrl);
        } catch (error) {
          reject(error);
        }
      });

      blobStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Error uploading to GCS:', error);
    throw error;
  }
}

/**
 * Delete file from Google Cloud Storage
 * @param {string} fileUrl - Public URL of the file
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteFromGCS(fileUrl) {
  if (!storage || !bucket) {
    throw new Error('Google Cloud Storage is not configured');
  }

  try {
    // Extract file path from URL
    const urlPattern = new RegExp(`https://storage.googleapis.com/${BUCKET_NAME}/(.+)`);
    const match = fileUrl.match(urlPattern);
    
    if (!match) {
      throw new Error('Invalid file URL format');
    }

    const filePath = match[1];
    const file = bucket.file(filePath);
    
    await file.delete();
    console.log(`File deleted: ${filePath}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting from GCS:', error);
    throw error;
  }
}

/**
 * Check if Cloud Storage is configured
 * @returns {boolean} Always returns true now (supports local fallback)
 */
export function isStorageConfigured() {
  return true; // Now supports local storage fallback
}
