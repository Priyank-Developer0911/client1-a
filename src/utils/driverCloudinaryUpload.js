/**
 * Driver Document Upload Utility for Cloudinary
 * Matches the Firebase structure from reference image
 */

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgzznmtcf";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";

/**
 * Upload driver document to Cloudinary
 * Returns both URL and publicId to match Firebase structure
 * @param {File} file - Document file to upload
 * @param {string} mobileNumber - Driver's mobile number (used as document ID)
 * @param {string} documentType - Type of document (Aadhaar_or_PAN_Card, Driving_License, etc.)
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadDriverDocument = async (file, mobileNumber, documentType) => {
  if (!file) {
    throw new Error("No file provided for upload");
  }

  try {
    // Create folder path: Drivers/+919876543210/Aadhaar_or_PAN_Card
    const sanitizedNumber = mobileNumber.replace(/[^0-9+]/g, '');
    const folder = `Drivers/${sanitizedNumber}/${documentType}`;
    
    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const publicId = `${folder}/${documentType}_${timestamp}`;
    
    formData.append('public_id', publicId);

    // Cloudinary upload endpoint
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    console.log(`📤 Uploading ${documentType} to Cloudinary...`);
    
    // Upload to Cloudinary
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    console.log(`✅ ${documentType} uploaded successfully:`, data.secure_url);
    
    // Return in the format matching Firebase structure
    return {
      publicId: data.public_id,
      url: data.secure_url
    };
  } catch (error) {
    console.error(`❌ Cloudinary upload error for ${documentType}:`, error);
    throw new Error(`Failed to upload ${documentType}: ${error.message}`);
  }
};

/**
 * Upload multiple driver documents
 * @param {Object} files - Object with documentType as keys and File objects as values
 * @param {string} mobileNumber - Driver's mobile number
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} - Object with document types and their Cloudinary data
 */
export const uploadMultipleDriverDocuments = async (files, mobileNumber, onProgress = null) => {
  const results = {};
  const fileEntries = Object.entries(files);
  const totalFiles = fileEntries.length;
  let uploadedCount = 0;

  for (const [documentType, file] of fileEntries) {
    if (file) {
      try {
        console.log(`📄 Uploading ${documentType}... (${uploadedCount + 1}/${totalFiles})`);
        
        const uploadResult = await uploadDriverDocument(file, mobileNumber, documentType);
        results[documentType] = uploadResult;
        
        uploadedCount++;
        
        if (onProgress) {
          onProgress({
            documentType,
            uploaded: uploadedCount,
            total: totalFiles,
            percentage: Math.round((uploadedCount / totalFiles) * 100)
          });
        }
        
        console.log(`✅ ${documentType} uploaded (${uploadedCount}/${totalFiles})`);
      } catch (error) {
        console.error(`❌ Failed to upload ${documentType}:`, error);
        throw error;
      }
    }
  }

  return results;
};

/**
 * Validate driver document file
 * @param {File} file - File to validate
 * @param {string} documentType - Type of document
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateDriverDocument = (file, documentType) => {
  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  // Check file size (max 5MB)
  const maxSizeBytes = 5 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { 
      valid: false, 
      error: `File size must be under 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
    };
  }

  // Check file type (images only for documents)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Please upload an image or PDF file.` 
    };
  }

  return { valid: true, error: null };
};

/**
 * Format file size for display
 * @param {number} bytes 
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default {
  uploadDriverDocument,
  uploadMultipleDriverDocuments,
  validateDriverDocument,
  formatFileSize
};
