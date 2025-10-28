import React, { useState, useEffect } from "react";
import {
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Snackbar,
  Box,
  Input,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebaseConfig";
import { doc, getDoc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const KYCPage = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [gstFile, setGstFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [incFile, setIncFile] = useState(null);
  const [signatoryFile, setSignatoryFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);

  const [services, setServices] = useState("");
  const [fleetDetails, setFleetDetails] = useState("");
  const [coverageZones, setCoverageZones] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [trackingCapability, setTrackingCapability] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch current user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          let userDoc = null;
          
          // Try to get user by phone number first
          if (user.phoneNumber) {
            const docSnap = await getDoc(doc(db, "users", user.phoneNumber));
            if (docSnap.exists()) {
              userDoc = docSnap.data();
            }
          }
          
          // If no phone number or document not found, try email query
          if (!userDoc && user.email) {
            const q = query(
              collection(db, "users"),
              where("email", "==", user.email)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              userDoc = querySnapshot.docs[0].data();
            }
          }
          
          if (userDoc) {
            setUserData(userDoc);
            console.log("User data loaded for KYC:", userDoc);
          } else {
            console.error("User data not found");
            setSnackbar({
              open: true,
              message: "User data not found. Please contact support.",
              severity: "error",
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setSnackbar({
            open: true,
            message: "Error loading user data. Please try again.",
            severity: "error",
          });
        }
      } else {
        navigate("/signin");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Upload file to Firebase Storage
  const uploadFile = async (file, folder) => {
    if (!file) return null;
    const userId = userData.mobileNumber || userData.email || auth.currentUser.uid;
    const fileRef = ref(storage, `${folder}/${userId}-${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userData) {
      setSnackbar({
        open: true,
        message: "User data not loaded. Please refresh and try again.",
        severity: "error",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Upload files
      const gstUrl = await uploadFile(gstFile, "gst");
      const panUrl = await uploadFile(panFile, "pan");
      const incUrl = await uploadFile(incFile, "incorporation");
      const signatoryUrl = await uploadFile(signatoryFile, "signatory");
      const bankUrl = await uploadFile(bankFile, "bank");

      // Determine document ID (use the same logic as user fetching)
      let docId = userData.mobileNumber;
      if (!docId) {
        // If no mobile number, we need to find the document ID by email
        const q = query(
          collection(db, "users"),
          where("email", "==", userData.email)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          docId = querySnapshot.docs[0].id;
        }
      }

      if (!docId) {
        throw new Error("Could not determine user document ID");
      }

      const docRef = doc(db, "users", docId);

      await updateDoc(docRef, {
        documents: {
          gstCertificate: gstUrl,
          panCard: panUrl,
          incorporation: incUrl,
          signatoryId: signatoryUrl,
          bankDetails: bankUrl,
        },
        operationalInfo: {
          services,
          fleetDetails,
          coverageZones,
          pricingModel,
          trackingCapability,
        },
        kycSubmitted: true,
        kycCompleted: false, // Will be set to true by admin
        status: "pending",
        kycSubmittedAt: new Date(),
      });

      setSnackbar({
        open: true,
        message: "KYC submitted successfully! Waiting for admin approval.",
        severity: "success",
      });

      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (err) {
      console.error("KYC submission error:", err);
      setSnackbar({
        open: true,
        message: `KYC submission failed: ${err.message}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Grid container justifyContent="center" alignItems="center" style={{ minHeight: "100vh" }}>
        <Typography variant="h6">Loading...</Typography>
      </Grid>
    );
  }

  if (!userData) {
    return (
      <Grid container justifyContent="center" alignItems="center" style={{ minHeight: "100vh" }}>
        <Paper elevation={10} sx={{ p: 4, width: 500, borderRadius: 2 }}>
          <Typography variant="h6" textAlign="center" color="error">
            Unable to load user data. Please try refreshing the page or contact support.
          </Typography>
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ mt: 2 }} 
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </Paper>
      </Grid>
    );
  }

  return (
    <Grid container justifyContent="center" style={{ minHeight: "100vh", py: 4 }}>
      <Paper elevation={10} sx={{ p: 4, maxWidth: 600, width: "100%", borderRadius: 2 }}>
        <Typography variant="h4" mb={2} textAlign="center" color="primary">
          Complete KYC Verification
        </Typography>
        
        <Typography variant="body2" mb={3} textAlign="center" color="text.secondary">
          Please upload the required documents and provide operational information to complete your verification.
        </Typography>

        <form onSubmit={handleSubmit}>
          {/* Document Upload Section */}
          <Typography variant="h6" mt={3} mb={2} color="primary">
            📄 Company Documents (Required)
          </Typography>
          
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel shrink>GST Certificate</InputLabel>
              <Input
                type="file"
                accept=".pdf,.jpg,.png,.jpeg"
                onChange={(e) => setGstFile(e.target.files[0])}
                sx={{ mt: 2 }}
              />
              {gstFile && <Chip label={gstFile.name} size="small" sx={{ mt: 1, alignSelf: "flex-start" }} />}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel shrink>PAN Card</InputLabel>
              <Input
                type="file"
                accept=".pdf,.jpg,.png,.jpeg"
                onChange={(e) => setPanFile(e.target.files[0])}
                sx={{ mt: 2 }}
              />
              {panFile && <Chip label={panFile.name} size="small" sx={{ mt: 1, alignSelf: "flex-start" }} />}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel shrink>Certificate of Incorporation</InputLabel>
              <Input
                type="file"
                accept=".pdf,.jpg,.png,.jpeg"
                onChange={(e) => setIncFile(e.target.files[0])}
                sx={{ mt: 2 }}
              />
              {incFile && <Chip label={incFile.name} size="small" sx={{ mt: 1, alignSelf: "flex-start" }} />}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel shrink>Signatory ID Proof</InputLabel>
              <Input
                type="file"
                accept=".pdf,.jpg,.png,.jpeg"
                onChange={(e) => setSignatoryFile(e.target.files[0])}
                sx={{ mt: 2 }}
              />
              {signatoryFile && <Chip label={signatoryFile.name} size="small" sx={{ mt: 1, alignSelf: "flex-start" }} />}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel shrink>Bank Details/Cancelled Cheque</InputLabel>
              <Input
                type="file"
                accept=".pdf,.jpg,.png,.jpeg"
                onChange={(e) => setBankFile(e.target.files[0])}
                sx={{ mt: 2 }}
              />
              {bankFile && <Chip label={bankFile.name} size="small" sx={{ mt: 1, alignSelf: "flex-start" }} />}
            </FormControl>
          </Box>

          {/* Operational Information Section */}
          <Typography variant="h6" mt={4} mb={2} color="primary">
            🚛 Operational Information (Optional)
          </Typography>
          
          <TextField 
            fullWidth 
            label="Types of Services (FTL, LTL, etc.)" 
            value={services} 
            onChange={(e) => setServices(e.target.value)} 
            sx={{ mb: 2 }} 
            placeholder="e.g., Full Truck Load, Less Than Truck Load, Express Delivery"
          />
          
          <TextField 
            fullWidth 
            label="Fleet Details (Type, Count)" 
            value={fleetDetails} 
            onChange={(e) => setFleetDetails(e.target.value)} 
            sx={{ mb: 2 }} 
            placeholder="e.g., 10 Trucks, 5 Tempo, 20 Two-wheelers"
          />
          
          <TextField 
            fullWidth 
            label="Coverage Zones" 
            value={coverageZones} 
            onChange={(e) => setCoverageZones(e.target.value)} 
            sx={{ mb: 2 }} 
            placeholder="e.g., Mumbai, Pune, Bangalore"
          />
          
          <TextField 
            fullWidth 
            label="Pricing Model" 
            value={pricingModel} 
            onChange={(e) => setPricingModel(e.target.value)} 
            sx={{ mb: 2 }} 
            placeholder="e.g., Per KM, Fixed Price, Weight-based"
          />
          
          <TextField 
            fullWidth 
            label="Tracking Capability" 
            value={trackingCapability} 
            onChange={(e) => setTrackingCapability(e.target.value)} 
            sx={{ mb: 3 }} 
            placeholder="e.g., GPS Enabled, Real-time tracking, SMS updates"
          />

          <Button 
            type="submit" 
            variant="contained" 
            fullWidth 
            size="large"
            disabled={loading}
            sx={{ mt: 3, py: 1.5 }}
          >
            {loading ? "Submitting..." : "Submit KYC for Verification"}
          </Button>

          <Button 
            variant="outlined" 
            fullWidth 
            sx={{ mt: 2 }} 
            onClick={() => navigate("/dashboard")}
            disabled={loading}
          >
            Back to Dashboard
          </Button>
        </form>
      </Paper>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Grid>
  );
};

export default KYCPage;