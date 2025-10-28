// ========================================
// CLIENT CODE (Old User Model)
// ========================================
import mongoose from 'mongoose';

// ========================================
// CHANGES BY DEVELOPER (Updated User Schema)
// Matching Firebase companies collection structure
// ========================================
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  companyName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  gstin: {
    type: String,
    default: null
  },
  address: {
    type: String,
    default: ''
  },
  kycStatus: {
    type: String,
    enum: ['not-submitted', 'pending', 'approved', 'rejected'],
    default: 'not-submitted'
  },
  kycDocuments: {
    gstin: {
      fileUrl: String,
      linkUrl: String,
      uploadedAt: Date
    },
    companyPan: {
      fileUrl: String,
      linkUrl: String,
      uploadedAt: Date
    },
    addressProof: {
      fileUrl: String,
      linkUrl: String,
      uploadedAt: Date
    },
    incorporationCertificate: {
      fileUrl: String,
      linkUrl: String,
      uploadedAt: Date
    },
    bankStatement: {
      fileUrl: String,
      linkUrl: String,
      uploadedAt: Date
    },
    operationalDetails: {
      numberOfVehicles: Number,
      numberOfDrivers: Number,
      operationalAreas: [String],
      businessType: String
    },
    submittedAt: Date,
    reviewedAt: Date,
    reviewNotes: String
  },
  role: {
    type: String,
    enum: ['corporate', 'admin', 'user'],
    default: 'corporate'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  firebaseUid: {
    type: String,
    default: null,
    index: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
