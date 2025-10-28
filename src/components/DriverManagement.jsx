import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  Stack,
  InputAdornment,
  Slide,
  DialogContentText,
  TableContainer,
  useMediaQuery,
  useTheme,
  CircularProgress,
  LinearProgress,
  Box,
  Chip,
  Link,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { MenuItem } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { 
  uploadDriverDocument, 
  uploadMultipleDriverDocuments,
  validateDriverDocument,
  formatFileSize 
} from "../utils/driverCloudinaryUpload";

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

const sanitize = (text) =>
  (text || "")
    .toString()
    .replace(/[*_`~]/g, "")
    .trim()
    .toLowerCase();

// Initial form data matching Firebase structure
const initialFormData = {
  firstName: "",
  lastName: "",
  mobileNumber: "",
  city: "",
  state: "",
  vehicleNumber: "",
  documents: {
    // Structure: { documentType: { publicId: "", url: "" } }
  },
};

// Document types matching Firebase structure
const DOCUMENT_TYPES = [
  { key: "Aadhaar_or_PAN_Card", label: "Aadhaar or PAN Card" },
  { key: "Driving_License", label: "Driving License" },
  { key: "Insurance_Certificate", label: "Insurance Certificate" },
  { key: "Vehicle_RC", label: "Vehicle RC" },
];

const DriverManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: "",
    driver: null,
  });
  const [loading, setLoading] = useState(true);
  const [editOriginal, setEditOriginal] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [companyName, setCompanyName] = useState("");

  // Fetch company name for approval
  const fetchCompanyName = useCallback(async () => {
    if (!user) return null;
    
    try {
      const companiesRef = collection(db, "companies");
      const companiesQuery = query(companiesRef, where("userId", "==", user.uid));
      const companiesSnap = await getDocs(companiesQuery);
      
      if (!companiesSnap.empty) {
        const companyDoc = companiesSnap.docs[0];
        const companyData = companyDoc.data();
        return companyData.companyName || companyData.company_name || "";
      }
      
      return "";
    } catch (error) {
      console.error("Error fetching company name:", error);
      return "";
    }
  }, [user]);

  // Fetch drivers from Firestore
  const fetchDrivers = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get company name first
      const fetchedCompanyName = await fetchCompanyName();
      setCompanyName(fetchedCompanyName);
      
      const driversRef = collection(db, "Drivers");
      const driversQuery = query(driversRef, where("userId", "==", user.uid));
      const driversSnap = await getDocs(driversQuery);
      let allDrivers = [];
      driversSnap.forEach((doc) => {
        allDrivers.push({ id: doc.id, ...doc.data() });
      });
      setDrivers(allDrivers);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching drivers: " + error.message,
        type: "error",
      });
    }
    setLoading(false);
  }, [user, fetchCompanyName]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    const lower = sanitize(search);
    setFiltered(
      drivers.filter((d) =>
        [
          d.firstName,
          d.lastName,
          d.mobileNumber,
          d.city,
          d.state,
          d.vehicleNumber,
        ].some((field) => sanitize(String(field)).includes(lower))
      )
    );
  }, [search, drivers]);

  const openForm = (mode, driver = null) => {
    setFormMode(mode);
    setFormData(driver || initialFormData);
    setErrors({});
    setDialogOpen(true);
    setEditOriginal(driver ? driver.id : "");
  };

  const closeForm = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
  };

  const validate = () => {
    const temp = {
      firstName: formData.firstName ? "" : "Required",
      lastName: formData.lastName ? "" : "Required",
      mobileNumber: formData.mobileNumber ? "" : "Required",
      city: formData.city ? "" : "Required",
      state: formData.state ? "" : "Required",
      vehicleNumber: formData.vehicleNumber ? "" : "Required",
    };
    setErrors(temp);
    return Object.values(temp).every((x) => x === "");
  };

  // Handle file selection (not upload yet)
  const handleFileSelect = (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file
    const validation = validateDriverDocument(file, docType);
    if (!validation.valid) {
      setSnackbar({
        open: true,
        message: validation.error,
        type: "error",
      });
      return;
    }
    
    // Store selected file
    setSelectedFiles(prev => ({
      ...prev,
      [docType]: file
    }));
    
    setSnackbar({
      open: true,
      message: `${docType.replace(/_/g, " ")} selected: ${file.name} (${formatFileSize(file.size)})`,
      type: "info",
    });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) {
      setSnackbar({
        open: true,
        message: "User not authenticated",
        type: "error",
      });
      return;
    }
    
    try {
      setUploadProgress({ message: "Preparing to upload documents...", percentage: 0 });
      
      const fetchedCompanyName = companyName || await fetchCompanyName();
      
      // Upload documents to Cloudinary
      const uploadedDocuments = {};
      
      if (Object.keys(selectedFiles).length > 0) {
        setUploadProgress({ message: "Uploading documents to Cloudinary...", percentage: 10 });
        
        const documentsData = await uploadMultipleDriverDocuments(
          selectedFiles,
          formData.mobileNumber,
          (progress) => {
            setUploadProgress({
              message: `Uploading ${progress.documentType}... (${progress.uploaded}/${progress.total})`,
              percentage: 10 + (progress.percentage * 0.7) // 10-80%
            });
          }
        );
        
        Object.assign(uploadedDocuments, documentsData);
      }
      
      // Merge with existing documents if editing
      const finalDocuments = {
        ...formData.documents,
        ...uploadedDocuments
      };
      
      setUploadProgress({ message: "Saving driver data to Firebase...", percentage: 90 });
      
      // Create driver data matching Firebase structure
      const driverData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobileNumber: formData.mobileNumber,
        city: formData.city,
        state: formData.state,
        vehicleNumber: formData.vehicleNumber,
        documents: finalDocuments,
        userId: user.uid,
        approvalStatus: "approved",
        approvedBy: fetchedCompanyName || "Corporate Admin",
        approvedDate: formMode === "add" ? Timestamp.now().toDate().toISOString() : formData.approvedDate,
        registrationDate: formMode === "add" ? Timestamp.now().toDate().toISOString() : formData.registrationDate,
        occupied: formData.occupied || false,
        current_order_id: formData.current_order_id || null,
        current_order_user_id: formData.current_order_user_id || null,
        rejectionReason: formData.rejectionReason || null,
      };
      
      // Use mobile number as document ID (matching Firebase structure)
      const driverDocRef = doc(db, "Drivers", formData.mobileNumber);
      await setDoc(driverDocRef, driverData);
      
      setUploadProgress({ message: "Driver saved successfully!", percentage: 100 });
      
      await fetchDrivers();
      
      setSnackbar({
        open: true,
        message: `Driver ${formMode === "add" ? "added" : "updated"} successfully!`,
        type: "success",
      });
      
      setTimeout(() => {
        setUploadProgress(null);
        setSelectedFiles({});
        closeForm();
      }, 1000);
      
    } catch (error) {
      console.error("Error saving driver:", error);
      setUploadProgress(null);
      setSnackbar({
        open: true,
        message: "Error saving driver: " + error.message,
        type: "error",
      });
    }
  };

  const handleDeleteConfirm = (driver) => {
    setConfirmDialog({ open: true, action: "delete", driver });
  };

  const handleEditConfirm = (driver) => {
    openForm("edit", driver);
  };

  const handleConfirmAction = async () => {
    const { action, driver } = confirmDialog;
    if (action === "delete") {
      try {
        await deleteDoc(doc(db, "Drivers", driver.id));
        await fetchDrivers();
        setSnackbar({ open: true, message: "Driver deleted", type: "warning" });
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Error deleting: " + error.message,
          type: "error",
        });
      }
    }
    setConfirmDialog({ open: false, action: "", driver: null });
  };

  const handleView = (driver) => {
    setViewData(driver);
    setViewDialogOpen(true);
  };

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view drivers</Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography
        variant="h4"
        sx={{ fontSize: { xs: 24, md: 40 } }}
        gutterBottom
      >
        Driver Management
      </Typography>

      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={2}
        alignItems={isMobile ? "stretch" : "center"}
        justifyContent="space-between"
        mt={4}
      >
        <TextField
          label="Search Drivers"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: isMobile ? "100%" : 300 }}
        />
        <Button
          startIcon={<PersonAddIcon />}
          variant="contained"
          fullWidth={isMobile}
          onClick={() => openForm("add")}
        >
          Add Driver
        </Button>
      </Stack>

      <Paper elevation={3} sx={{ mt: 3, overflowX: "auto" }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>City</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Vehicle No</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((driver) => (
                  <TableRow key={driver.id} hover>
                    <TableCell>{driver.firstName}</TableCell>
                    <TableCell>{driver.lastName}</TableCell>
                    <TableCell>{driver.mobileNumber}</TableCell>
                    <TableCell>{driver.city}</TableCell>
                    <TableCell>{driver.state}</TableCell>
                    <TableCell>{driver.vehicleNumber}</TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        <IconButton
                          onClick={() => handleView(driver)}
                          color="info"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleEditConfirm(driver)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteConfirm(driver)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Driver Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeForm}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {formMode === "add" ? "Add Driver" : "Edit Driver"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              error={!!errors.firstName}
              helperText={errors.firstName}
              fullWidth
            />
            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              error={!!errors.lastName}
              helperText={errors.lastName}
              fullWidth
            />
            <TextField
              label="Mobile Number"
              value={formData.mobileNumber}
              onChange={(e) =>
                setFormData({ ...formData, mobileNumber: e.target.value })
              }
              error={!!errors.mobileNumber}
              helperText={errors.mobileNumber}
              fullWidth
            />
            <TextField
              label="City"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              error={!!errors.city}
              helperText={errors.city}
              fullWidth
            />
            <TextField
              label="State"
              value={formData.state}
              onChange={(e) =>
                setFormData({ ...formData, state: e.target.value })
              }
              error={!!errors.state}
              helperText={errors.state}
              fullWidth
            />
            <TextField
              label="Vehicle Number"
              value={formData.vehicleNumber}
              onChange={(e) =>
                setFormData({ ...formData, vehicleNumber: e.target.value })
              }
              error={!!errors.vehicleNumber}
              helperText={errors.vehicleNumber}
              fullWidth
            />
            {/* ========================================
                REMOVED: Last Completed Order and Last Delivery Time fields
                Date: October 28, 2025
                ========================================
            <TextField
              label="Last Completed Order"
              value={formData.last_completed_order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  last_completed_order: e.target.value,
                })
              }
              fullWidth
            />
            <TextField
              label="Last Delivery Time"
              value={formData.last_delivery_time}
              onChange={(e) =>
                setFormData({ ...formData, last_delivery_time: e.target.value })
              }
              fullWidth
            />
            */}
            {/* ========================================
                REMOVED: Occupied dropdown field
                Date: October 28, 2025
                ========================================
            <TextField
              select
              label="Occupied"
              value={formData.occupied ? "Yes" : "No"}
              onChange={(e) =>
                setFormData({ ...formData, occupied: e.target.value === "Yes" })
              }
              fullWidth
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </TextField>
            */}
            
            {/* Upload Progress */}
            {uploadProgress && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <Typography variant="body2" color="primary" gutterBottom>
                  {uploadProgress.message}
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress.percentage} />
                <Typography variant="caption" color="text.secondary">
                  {uploadProgress.percentage}%
                </Typography>
              </Box>
            )}
            
            {/* Document Uploads */}
            <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
              📄 Upload Driver Documents
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block" mb={2}>
              All documents will be stored securely
            </Typography>
            
            {DOCUMENT_TYPES.map((doc) => (
              <Stack
                key={doc.key}
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Button 
                  variant="outlined" 
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {doc.label}
                  <input
                    type="file"
                    hidden
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileSelect(e, doc.key)}
                  />
                </Button>
                
                {/* Show if file is selected */}
                {selectedFiles[doc.key] && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={selectedFiles[doc.key].name}
                    color="success"
                    size="small"
                  />
                )}
                
                {/* Show if already uploaded (for edit mode) */}
                {formData.documents && formData.documents[doc.key]?.url && !selectedFiles[doc.key] && (
                  <Link
                    href={formData.documents[doc.key].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                  >
                    <Chip
                      label="View Uploaded"
                      color="info"
                      size="small"
                      clickable
                    />
                  </Link>
                )}
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm} disabled={uploadProgress !== null}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={uploadProgress !== null}
          >
            {uploadProgress ? "Uploading..." : (formMode === "add" ? "Add Driver" : "Save Changes")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Driver Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Driver Details</Typography>
            {viewData && (
              <Chip
                label={viewData.approvalStatus || "Approved"}
                color="success"
                size="small"
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {viewData && (
            <Stack spacing={3}>
              {/* Personal Information */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                  👤 Personal Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>First Name:</strong> {viewData.firstName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Last Name:</strong> {viewData.lastName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Mobile Number:</strong> {viewData.mobileNumber}
                  </Typography>
                  <Typography variant="body2">
                    <strong>City:</strong> {viewData.city}
                  </Typography>
                  <Typography variant="body2">
                    <strong>State:</strong> {viewData.state}
                  </Typography>
                </Stack>
              </Paper>

              {/* Vehicle Information */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                  🚛 Vehicle Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Vehicle Number:</strong> {viewData.vehicleNumber}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Occupied:</strong>{" "}
                    <Chip
                      label={viewData.occupied ? "Yes" : "No"}
                      color={viewData.occupied ? "warning" : "success"}
                      size="small"
                    />
                  </Typography>
                </Stack>
              </Paper>

              {/* Approval Information */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#e8f5e9" }}>
                <Typography variant="subtitle1" fontWeight={600} color="success.main" gutterBottom>
                  ✅ Approval Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Approved By:</strong> {viewData.approvedBy || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Approval Date:</strong>{" "}
                    {viewData.approvedDate
                      ? new Date(viewData.approvedDate).toLocaleString()
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Registration Date:</strong>{" "}
                    {viewData.registrationDate
                      ? new Date(viewData.registrationDate).toLocaleString()
                      : "N/A"}
                  </Typography>
                </Stack>
              </Paper>

              {/* Documents */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                  📄 Uploaded Documents
                </Typography>
                <Stack spacing={2}>
                  {DOCUMENT_TYPES.map((doc) => (
                    <Box key={doc.key}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        {doc.label}:
                      </Typography>
                      {viewData.documents?.[doc.key]?.url ? (
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Link
                            href={viewData.documents[doc.key].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                          >
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<VisibilityIcon />}
                            >
                              View Document
                            </Button>
                          </Link>
                          <Typography variant="caption" color="text.secondary">
                            {viewData.documents[doc.key].publicId}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Not uploaded
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        TransitionComponent={Transition}
      >
        <DialogTitle>
          {`Confirm ${
            confirmDialog.action === "delete" ? "Deletion" : "Action"
          }`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === "delete"
              ? "Are you sure you want to delete this driver? This action cannot be undone."
              : "Are you sure you want to proceed with this action?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={confirmDialog.action === "delete" ? "error" : "primary"}
          >
            {confirmDialog.action === "delete" ? "Delete" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.type}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DriverManagement;
