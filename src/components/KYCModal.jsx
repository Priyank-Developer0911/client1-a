import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Typography,
  Button, TextField, Snackbar, Box, Chip, IconButton, Stepper, Step,
  StepLabel, Card, CardContent, Divider, LinearProgress, Tab, Tabs,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Checkbox
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LinkIcon from "@mui/icons-material/Link";
import BusinessIcon from "@mui/icons-material/Business";
import DescriptionIcon from "@mui/icons-material/Description";
import { auth, db } from "../firebaseConfig";
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from "firebase/firestore";

// ========================================
// CHANGES BY DEVELOPER
// Import Cloudinary upload utilities instead of Firebase Storage
// ========================================
import { uploadKYCDocument, uploadCompanyLogo, validateFile } from "../utils/cloudinaryUpload";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const KYCModal = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMethod, setUploadMethod] = useState("file"); // "file" or "link"
  const [logoUploadMethod, setLogoUploadMethod] = useState("file"); // "file" or "link" for logo

  // Document states for files
  const [gstFile, setGstFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [incFile, setIncFile] = useState(null);
  const [signatoryFile, setSignatoryFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);

  // Document states for links
  const [gstLink, setGstLink] = useState("");
  const [panLink, setPanLink] = useState("");
  const [incLink, setIncLink] = useState("");
  const [signatoryLink, setSignatoryLink] = useState("");
  const [bankLink, setBankLink] = useState("");

  // ========================================
  // CHANGES BY DEVELOPER
  // Updated operational info states matching reference structure
  // ========================================
  // Company logo
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyLogoLink, setCompanyLogoLink] = useState("");
  
  // Description
  const [description, setDescription] = useState("");
  
  // Service boolean flags
  const [multimodalServices, setMultimodalServices] = useState(false);
  const [multitemperatureService, setMultitemperatureService] = useState(false);
  const [partialLoadingAndUnloading, setPartialLoadingAndUnloading] = useState(false);
  const [realtimeTracking, setRealtimeTracking] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const steps = ["Company Documents", "Operational Details", "Review & Submit"];
  
  const documentFields = [
    { 
      name: "GST Certificate", 
      file: gstFile, 
      fileSetter: setGstFile, 
      link: gstLink, 
      linkSetter: setGstLink, 
      required: true 
    },
    { 
      name: "PAN Card", 
      file: panFile, 
      fileSetter: setPanFile, 
      link: panLink, 
      linkSetter: setPanLink, 
      required: true 
    },
    { 
      name: "Certificate of Incorporation", 
      file: incFile, 
      fileSetter: setIncFile, 
      link: incLink, 
      linkSetter: setIncLink, 
      required: true 
    },
    { 
      name: "Signatory ID Proof", 
      file: signatoryFile, 
      fileSetter: setSignatoryFile, 
      link: signatoryLink, 
      linkSetter: setSignatoryLink, 
      required: true 
    },
    { 
      name: "Bank Details/Cancelled Cheque", 
      file: bankFile, 
      fileSetter: setBankFile, 
      link: bankLink, 
      linkSetter: setBankLink, 
      required: true 
    },
  ];

  const resetForm = () => {
    setActiveStep(0);
    setUploadMethod("file");
    setLogoUploadMethod("file");
    
    // Reset files
    setGstFile(null);
    setPanFile(null);
    setIncFile(null);
    setSignatoryFile(null);
    setBankFile(null);
    
    // Reset links
    setGstLink("");
    setPanLink("");
    setIncLink("");
    setSignatoryLink("");
    setBankLink("");
    
    // ========================================
    // CHANGES BY DEVELOPER
    // Reset new operational fields
    // ========================================
    setCompanyLogo(null);
    setCompanyLogoLink("");
    setDescription("");
    setMultimodalServices(false);
    setMultitemperatureService(false);
    setPartialLoadingAndUnloading(false);
    setRealtimeTracking(false);
    
    setUploadProgress(0);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  // ========================================
  // REMOVED: Firebase Storage upload function
  // Now using Cloudinary upload utility
  // ========================================

  const validateURL = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleFileChange = (setter) => (event) => {
    const file = event.target.files[0];
    if (file) {
      // Use Cloudinary validation
      const validation = validateFile(file, 5);
      if (!validation.valid) {
        setSnackbar({ open: true, message: validation.error, severity: "error" });
        return;
      }
      setter(file);
    }
  };

  const handleLinkChange = (setter) => (event) => {
    const url = event.target.value;
    setter(url);
  };

  const clearDocument = (docIndex) => {
    const doc = documentFields[docIndex];
    doc.fileSetter(null);
    doc.linkSetter("");
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate company documents
      if (uploadMethod === "file") {
        const requiredFiles = [gstFile, panFile, incFile, signatoryFile, bankFile];
        if (requiredFiles.some(file => !file)) {
          setSnackbar({ 
            open: true, 
            message: "Please upload all required company documents.", 
            severity: "error" 
          });
          return;
        }
      } else {
        const requiredLinks = [gstLink, panLink, incLink, signatoryLink, bankLink];
        if (requiredLinks.some(link => !link.trim())) {
          setSnackbar({ 
            open: true, 
            message: "Please provide all required document links.", 
            severity: "error" 
          });
          return;
        }
        
        // Validate URLs
        const invalidLinks = requiredLinks.filter(link => link.trim() && !validateURL(link));
        if (invalidLinks.length > 0) {
          setSnackbar({ 
            open: true, 
            message: "Please provide valid URLs for all document links.", 
            severity: "error" 
          });
          return;
        }
      }
    } else if (activeStep === 1) {
      // Validate operational details
      // Logo validation
      if (logoUploadMethod === "file") {
        if (!companyLogo) {
          setSnackbar({ 
            open: true, 
            message: "Please upload your company logo.", 
            severity: "error" 
          });
          return;
        }
      } else {
        if (!companyLogoLink.trim()) {
          setSnackbar({ 
            open: true, 
            message: "Please provide your company logo link.", 
            severity: "error" 
          });
          return;
        }
        if (!validateURL(companyLogoLink)) {
          setSnackbar({ 
            open: true, 
            message: "Please provide a valid URL for the company logo.", 
            severity: "error" 
          });
          return;
        }
      }
      
      // Description validation
      if (!description.trim()) {
        setSnackbar({ 
          open: true, 
          message: "Please provide a company description.", 
          severity: "error" 
        });
        return;
      }
      
      if (description.trim().length < 20) {
        setSnackbar({ 
          open: true, 
          message: "Company description must be at least 20 characters.", 
          severity: "error" 
        });
        return;
      }
    }
    
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      setSnackbar({ 
        open: true, 
        message: "No user is logged in. Please sign in again.", 
        severity: "error" 
      });
      return;
    }

    setLoading(true);
    try {
      setUploadProgress(10);
      const uid = user.uid;
      
      // ========================================
      // CHANGES BY DEVELOPER
      // Find company document by userId - with retry logic
      // ========================================
      const companiesRef = collection(db, "companies");
      const q = query(companiesRef, where("userId", "==", uid));
      
      // Retry mechanism - sometimes Firestore needs a moment
      let querySnapshot = await getDocs(q);
      let retryCount = 0;
      const maxRetries = 3;
      
      while (querySnapshot.empty && retryCount < maxRetries) {
        console.log(`Company not found, retry attempt ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        querySnapshot = await getDocs(q);
        retryCount++;
      }
      
      if (querySnapshot.empty) {
        console.error("User ID:", uid);
        console.error("Query result:", querySnapshot);
        throw new Error("Company profile not found. Please ensure you completed the signup process or contact support.");
      }
      
      const companyDoc = querySnapshot.docs[0];
      const companyName = companyDoc.id; // Document ID is the company name
      
      console.log("Found company:", companyName, "for user:", uid);
      
      setUploadProgress(15);
      
      let documentUrls = {};

      if (uploadMethod === "file") {
        // ========================================
        // CHANGES BY DEVELOPER
        // Upload files to Cloudinary instead of Firebase Storage
        // ========================================
        console.log("📤 Uploading documents to Cloudinary...");
        
        const gstUrl = await uploadKYCDocument(gstFile, companyName, "gst");
        setUploadProgress(25);
        console.log("✅ GST uploaded:", gstUrl);
        
        const panUrl = await uploadKYCDocument(panFile, companyName, "pan");
        setUploadProgress(40);
        console.log("✅ PAN uploaded:", panUrl);
        
        const incUrl = await uploadKYCDocument(incFile, companyName, "incorporation");
        setUploadProgress(55);
        console.log("✅ Incorporation uploaded:", incUrl);
        
        const signatoryUrl = await uploadKYCDocument(signatoryFile, companyName, "signatory");
        setUploadProgress(70);
        console.log("✅ Signatory ID uploaded:", signatoryUrl);
        
        const bankUrl = await uploadKYCDocument(bankFile, companyName, "bank");
        setUploadProgress(85);
        console.log("✅ Bank details uploaded:", bankUrl);
        
        // ========================================
        // Match exact field names from reference image
        // ========================================
        documentUrls = {
          gstCertificate: gstUrl,
          panCard: panUrl,
          incorporationCertificate: incUrl,
          signatoryId: signatoryUrl,
          bankDetails: bankUrl,
        };
      } else {
        // Use provided links
        setUploadProgress(50);
        documentUrls = {
          gstCertificate: gstLink,
          panCard: panLink,
          incorporationCertificate: incLink,
          signatoryId: signatoryLink,
          bankDetails: bankLink,
        };
        setUploadProgress(85);
      }
      
      // ========================================
      // CHANGES BY DEVELOPER
      // Upload company logo to Cloudinary if provided
      // ========================================
      let companyLogoUrl = null;
      if (logoUploadMethod === "file" && companyLogo) {
        console.log("📤 Uploading logo to Cloudinary...");
        companyLogoUrl = await uploadCompanyLogo(companyLogo, companyName);
        console.log("✅ Logo uploaded:", companyLogoUrl);
        setUploadProgress(90);
      } else if (logoUploadMethod === "link" && companyLogoLink) {
        companyLogoUrl = companyLogoLink;
        setUploadProgress(90);
      }

      // ========================================
      // CHANGES BY DEVELOPER
      // Update companies collection with new structure
      // ========================================
      const companyDocRef = doc(db, "companies", companyName);
      await updateDoc(companyDocRef, {
        documents: documentUrls, // Matches reference structure
        documentUploadMethod: uploadMethod, // Track which method was used (file/link)
        
        // Updated operational fields
        company_logo: companyLogoUrl,
        description: description,
        
        // Service capabilities (boolean flags)
        multimodalServices: multimodalServices,
        multitemperatureService: multitemperatureService,
        partialLoadingAndUnloading: partialLoadingAndUnloading,
        realtimeTracking: realtimeTracking,
        
        kycStatus: "pending", // Update status to 'pending' for admin review
        kycSubmittedAt: new Date(),
      });

      setUploadProgress(100);
      setSnackbar({ 
        open: true, 
        message: "KYC submitted successfully! Waiting for admin approval.", 
        severity: "success" 
      });
      
      setTimeout(() => {
        onClose(); // Close the modal and trigger refresh in Dashboard
      }, 2000);

    } catch (err) {
      console.error("KYC submission error:", err);
      
      // Provide more specific error messages
      let errorMessage = "Submission failed. Please try again.";
      
      if (err.message.includes("Company profile not found")) {
        errorMessage = "Company profile not found. Please logout and login again, or contact support.";
      } else if (err.message.includes("No user is logged in")) {
        errorMessage = "Session expired. Please login again.";
      } else if (err.message.includes("permission-denied")) {
        errorMessage = "Permission denied. Please check your account status.";
      } else if (err.message.includes("network")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        errorMessage = `Submission failed: ${err.message}`;
      }
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: "error" 
      });
      
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0: return renderDocumentUpload();
      case 1: return renderOperationalDetails();
      case 2: return renderReview();
      default: return "Unknown step";
    }
  };

  const renderDocumentUpload = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Upload Required Documents</Typography>
      
      {/* Upload Method Selection */}
      <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
        <CardContent>
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="subtitle2" color="primary">
                Choose Upload Method
              </Typography>
            </FormLabel>
            <RadioGroup
              row
              value={uploadMethod}
              onChange={(e) => {
                setUploadMethod(e.target.value);
                // Clear all documents when switching methods
                documentFields.forEach((_, index) => clearDocument(index));
              }}
            >
              <FormControlLabel 
                value="file" 
                control={<Radio />} 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudUploadIcon fontSize="small" />
                    Upload Files
                  </Box>
                } 
              />
              <FormControlLabel 
                value="link" 
                control={<Radio />} 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon fontSize="small" />
                    Provide Links
                  </Box>
                } 
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* Document Upload/Link Section */}
      <Grid container spacing={2}>
        {documentFields.map((docItem, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Card 
              variant="outlined" 
              sx={{ 
                border: (uploadMethod === "file" ? docItem.file : docItem.link.trim()) 
                  ? "2px solid #4caf50" 
                  : "2px dashed #ccc" 
              }}
            >
              <CardContent>
                {uploadMethod === "file" ? (
                  // File Upload Mode
                  <Box sx={{ textAlign: 'center' }}>
                    <CloudUploadIcon 
                      sx={{ 
                        fontSize: 30, 
                        mb: 1, 
                        color: docItem.file ? 'success.main' : 'text.secondary' 
                      }} 
                    />
                    <Typography variant="subtitle2" gutterBottom>
                      {docItem.name}
                    </Typography>
                    <input 
                      accept=".pdf,.jpg,.png,.jpeg" 
                      style={{ display: "none" }} 
                      id={`file-${index}`} 
                      type="file" 
                      onChange={handleFileChange(docItem.fileSetter)} 
                    />
                    <label htmlFor={`file-${index}`}>
                      <Button variant="outlined" component="span" size="small">
                        {docItem.file ? "Change File" : "Choose File"}
                      </Button>
                    </label>
                    {docItem.file && (
                      <Chip 
                        label={docItem.file.name} 
                        size="small" 
                        sx={{ mt: 1, maxWidth: "100%" }} 
                        color="success" 
                        onDelete={() => docItem.fileSetter(null)}
                      />
                    )}
                  </Box>
                ) : (
                  // Link Input Mode
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LinkIcon 
                        sx={{ 
                          fontSize: 24, 
                          mr: 1, 
                          color: docItem.link.trim() ? 'success.main' : 'text.secondary' 
                        }} 
                      />
                      <Typography variant="subtitle2">
                        {docItem.name}
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="https://example.com/document.pdf"
                      value={docItem.link}
                      onChange={handleLinkChange(docItem.linkSetter)}
                      error={docItem.link.trim() && !validateURL(docItem.link)}
                      helperText={
                        docItem.link.trim() && !validateURL(docItem.link)
                          ? "Please enter a valid URL"
                          : ""
                      }
                    />
                    {docItem.link.trim() && validateURL(docItem.link) && (
                      <Chip 
                        label="Valid Link" 
                        size="small" 
                        sx={{ mt: 1 }} 
                        color="success" 
                      />
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {uploadMethod === "link" && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> Please ensure all document links are publicly accessible 
            and lead directly to the document files (PDF, JPG, PNG formats preferred).
          </Typography>
        </Box>
      )}
    </Box>
  );

  // ========================================
  // CHANGES BY DEVELOPER
  // Updated Operational Details to match reference structure
  // ========================================
  const renderOperationalDetails = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Operational Information</Typography>
      
      {/* Company Logo Upload */}
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <BusinessIcon fontSize="small" />
          Company Logo <Chip label="Required" size="small" color="error" sx={{ ml: 1 }} />
        </Typography>
        
        {/* Logo Upload Method Selection */}
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <RadioGroup
            row
            value={logoUploadMethod}
            onChange={(e) => {
              setLogoUploadMethod(e.target.value);
              setCompanyLogo(null);
              setCompanyLogoLink("");
            }}
          >
            <FormControlLabel 
              value="file" 
              control={<Radio size="small" />} 
              label={<Typography variant="body2">Upload File</Typography>}
            />
            <FormControlLabel 
              value="link" 
              control={<Radio size="small" />} 
              label={<Typography variant="body2">Provide Link</Typography>}
            />
          </RadioGroup>
        </FormControl>
        
        {logoUploadMethod === "file" ? (
          <Box sx={{ textAlign: 'center' }}>
            <input 
              accept="image/*" 
              style={{ display: "none" }} 
              id="logo-upload" 
              type="file" 
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                    setSnackbar({ open: true, message: "Logo size must be under 2MB.", severity: "error" });
                    return;
                  }
                  if (!file.type.startsWith('image/')) {
                    setSnackbar({ open: true, message: "Please upload an image file.", severity: "error" });
                    return;
                  }
                  setCompanyLogo(file);
                }
              }} 
            />
            <label htmlFor="logo-upload">
              <Button 
                variant="outlined" 
                component="span" 
                size="small" 
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                {companyLogo ? "Change Logo" : "Upload Logo"}
              </Button>
            </label>
            {companyLogo && (
              <Box sx={{ mt: 2 }}>
                <Chip 
                  label={companyLogo.name} 
                  size="small" 
                  sx={{ maxWidth: "100%" }} 
                  color="success" 
                  onDelete={() => setCompanyLogo(null)}
                />
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  {(companyLogo.size / 1024).toFixed(2)} KB
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <TextField
            fullWidth
            size="small"
            placeholder="https://example.com/logo.png"
            value={companyLogoLink}
            onChange={(e) => setCompanyLogoLink(e.target.value)}
            error={companyLogoLink && !validateURL(companyLogoLink)}
            helperText={companyLogoLink && !validateURL(companyLogoLink) ? "Please enter a valid URL" : ""}
            InputProps={{
              startAdornment: <LinkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        )}
      </Card>

      {/* Description */}
      <TextField 
        fullWidth 
        multiline
        rows={4}
        label="Company Description" 
        value={description} 
        onChange={(e) => setDescription(e.target.value)} 
        placeholder="Brief description of your logistics services and company..."
        required
        error={description && description.trim().length < 20}
        helperText={description && description.trim().length < 20 ? "Minimum 20 characters required" : `${description.length} characters`}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: <DescriptionIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
        }}
      />

      {/* Service Capabilities - Compact Checkboxes */}
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="primary" sx={{ mb: 2 }}>
          Service Capabilities
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={multimodalServices} 
                  onChange={(e) => setMultimodalServices(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Multimodal Services</Typography>}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={multitemperatureService} 
                  onChange={(e) => setMultitemperatureService(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Multi-temperature Service</Typography>}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={partialLoadingAndUnloading} 
                  onChange={(e) => setPartialLoadingAndUnloading(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Partial Loading/Unloading</Typography>}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={realtimeTracking} 
                  onChange={(e) => setRealtimeTracking(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Realtime Tracking</Typography>}
            />
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
  
  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Review Your Information</Typography>
      
      {/* Documents Section */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom color="primary">
            Documents {uploadMethod === "file" ? "Uploaded" : "Provided"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
            Method: {uploadMethod === "file" ? "File Upload" : "Document Links"}
          </Typography>
          {documentFields.map((docItem, index) => {
            const hasDocument = uploadMethod === "file" ? docItem.file : docItem.link.trim();
            return (
              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2">{docItem.name}</Typography>
                <Chip 
                  label={hasDocument ? '✓ Provided' : '✗ Missing'} 
                  size="small" 
                  color={hasDocument ? 'success' : 'error'}
                />
              </Box>
            );
          })}
        </CardContent>
      </Card>
      
      {/* Operational Information Section */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom color="primary">
            Operational Information
          </Typography>
          
          {/* Company Logo */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Company Logo:</strong>
            </Typography>
            {logoUploadMethod === "file" && companyLogo ? (
              <Chip 
                label={companyLogo.name} 
                size="small" 
                color="success" 
                icon={<BusinessIcon />}
              />
            ) : logoUploadMethod === "link" && companyLogoLink ? (
              <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'primary.main' }}>
                {companyLogoLink}
              </Typography>
            ) : (
              <Typography variant="body2" color="error">Not provided</Typography>
            )}
          </Box>
          
          {/* Description */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Company Description:</strong>
            </Typography>
            {description ? (
              <Typography variant="body2" sx={{ 
                bgcolor: 'grey.50', 
                p: 1, 
                borderRadius: 1, 
                fontStyle: 'italic' 
              }}>
                {description}
              </Typography>
            ) : (
              <Typography variant="body2" color="error">Not provided</Typography>
            )}
          </Box>
          
          {/* Service Capabilities */}
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Service Capabilities:</strong>
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <Chip 
                  label="Multimodal Services" 
                  size="small" 
                  color={multimodalServices ? "success" : "default"}
                  variant={multimodalServices ? "filled" : "outlined"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Chip 
                  label="Multi-temperature Service" 
                  size="small" 
                  color={multitemperatureService ? "success" : "default"}
                  variant={multitemperatureService ? "filled" : "outlined"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Chip 
                  label="Partial Loading/Unloading" 
                  size="small" 
                  color={partialLoadingAndUnloading ? "success" : "default"}
                  variant={partialLoadingAndUnloading ? "filled" : "outlined"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Chip 
                  label="Realtime Tracking" 
                  size="small" 
                  color={realtimeTracking ? "success" : "default"}
                  variant={realtimeTracking ? "filled" : "outlined"}
                />
              </Grid>
            </Grid>
            {!multimodalServices && !multitemperatureService && !partialLoadingAndUnloading && !realtimeTracking && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                No service capabilities selected
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5" color="primary">Complete KYC Verification</Typography>
          <IconButton onClick={onClose} disabled={loading}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {loading && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" gutterBottom>
                Submitting your information... {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
          <Stepper activeStep={activeStep} sx={{ my: 3 }}>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {getStepContent(activeStep)}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button disabled={activeStep === 0 || loading} onClick={handleBack}>
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit for Verification"}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext} disabled={loading}>
              Next
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })} 
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default KYCModal;