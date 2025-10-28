// ========================================
// CLIENT CODE (Old Route)
// ========================================
// routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// ========================================
// CHANGES BY DEVELOPER (Updated Sign Up Route)
// Matching Firebase structure from reference image
// ========================================
router.post('/signup', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      companyName, 
      phoneNumber, 
      address, 
      firstName, 
      lastName,
      firebaseUid,
      kycStatus 
    } = req.body;

    // Validate required fields
    if (!email || !password || !companyName || !phoneNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, password, company name, and phone number are required' 
      });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user matching the schema structure
    const newUser = new User({
      email: normalizedEmail,
      password: hashedPassword,
      companyName: companyName,
      phoneNumber: phoneNumber,
      gstin: null,
      address: address || '',
      kycStatus: kycStatus || 'not-submitted',
      kycDocuments: {
        gstin: { fileUrl: null, linkUrl: null },
        companyPan: { fileUrl: null, linkUrl: null },
        addressProof: { fileUrl: null, linkUrl: null },
        incorporationCertificate: { fileUrl: null, linkUrl: null },
        bankStatement: { fileUrl: null, linkUrl: null },
        operationalDetails: {
          numberOfVehicles: 0,
          numberOfDrivers: 0,
          operationalAreas: [],
          businessType: ''
        }
      },
      role: 'corporate',
      isActive: true,
      // Store Firebase UID for cross-reference
      firebaseUid: firebaseUid || null
    });

    await newUser.save();
    
    return res.status(201).json({ 
      success: true,
      message: 'User registered successfully!',
      user: {
        id: newUser._id,
        email: newUser.email,
        companyName: newUser.companyName,
        phoneNumber: newUser.phoneNumber,
        kycStatus: newUser.kycStatus
      }
    });

  } catch (err) {
    console.error('❌ Registration error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ========================================
// CLIENT CODE (Sign In Route - Kept Same)
// ========================================
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

export default router;
