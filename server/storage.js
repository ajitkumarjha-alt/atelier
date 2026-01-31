import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

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
    console.warn('⚠️  Google Cloud Storage not configured. File uploads will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error.message);
}

// Configure multer for memory storage
const multerStorage = multer.memoryStorage();

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
 * Upload file to Google Cloud Storage
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} originalName - Original file name
 * @param {string} mimetype - File MIME type
 * @param {string} folder - Folder path in bucket (e.g., 'mas', 'rfi', 'drawings')
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export async function uploadToGCS(fileBuffer, originalName, mimetype, folder = 'general') {
  if (!storage || !bucket) {
    throw new Error('Google Cloud Storage is not configured');
  }

  try {
    // Generate unique filename
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const filePath = `${folder}/${filename}`;

    // Create a new blob in the bucket
    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: mimetype,
        metadata: {
          originalName: originalName,
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
 * @returns {boolean}
 */
export function isStorageConfigured() {
  return storage !== null && bucket !== null;
}
