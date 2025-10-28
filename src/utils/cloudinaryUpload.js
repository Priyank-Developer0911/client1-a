/**
 * Cloudinary Upload Utility
 * Handles file uploads to Cloudinary with proper organization
 */

// Cloudinary configuration from environment variables
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dgzznmtcf";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";

/**
 * Upload file to Cloudinary
 * @param {File} file - The file to upload
 * @param {string} folder - The folder path in Cloudinary (e.g., "Companies/CompanyName/logo")
 * @param {string} resourceType - Type of resource: 'image', 'raw', 'video', 'auto'
 * @returns {Promise<string>} - Returns the secure URL of uploaded file
 */
export const uploadToCloudinary = async (file, folder, resourceType = 'auto') => {
  if (!file) {
    throw new Error("No file provided for upload");
  }

  try {
    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    
    // Add timestamp to filename to make it unique
    const timestamp = Date.now();
    formData.append('public_id', `${timestamp}-${file.name.split('.')[0]}`);

    // Cloudinary upload endpoint
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

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
    
    // Return the secure URL
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Upload KYC document to Cloudinary
 * @param {File} file - Document file
 * @param {string} companyName - Company name for folder organization
 * @param {string} documentType - Type of document (gst, pan, incorporation, signatory, bank)
 * @returns {Promise<string>} - Cloudinary URL
 */
export const uploadKYCDocument = async (file, companyName, documentType) => {
  // Sanitize company name for folder path
  const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Create folder path: Companies/CompanyName/documentType
  const folder = `Companies/${sanitizedCompanyName}/${documentType}`;
  
  return await uploadToCloudinary(file, folder, 'auto');
};

/**
 * Upload company logo to Cloudinary
 * @param {File} file - Logo file (image)
 * @param {string} companyName - Company name for folder organization
 * @returns {Promise<string>} - Cloudinary URL
 */
export const uploadCompanyLogo = async (file, companyName) => {
  // Sanitize company name for folder path
  const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Create folder path: Companies/CompanyName/logo
  const folder = `Companies/${sanitizedCompanyName}/logo`;
  
  return await uploadToCloudinary(file, folder, 'image');
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum file size in MB
 * @param {string[]} allowedTypes - Allowed MIME types
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateFile = (file, maxSizeMB = 5, allowedTypes = []) => {
  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { 
      valid: false, 
      error: `File size must be under ${maxSizeMB}MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
    };
  }

  // Check file type if specified
  if (allowedTypes.length > 0) {
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
      };
    }
  }

  return { valid: true, error: null };
};

/**
 * Get file extension from filename
 * @param {string} filename 
 * @returns {string}
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
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
  uploadToCloudinary,
  uploadKYCDocument,
  uploadCompanyLogo,
  validateFile,
  getFileExtension,
  formatFileSize
};
