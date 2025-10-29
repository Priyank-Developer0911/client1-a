import React, {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useMemo,
} from "react";
import {
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Link, 
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  Alert,
  Stack,
  InputAdornment,
  Select,
  Slide,
  DialogContentText,
  TableContainer,
  CircularProgress,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";


import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

// --- CONSTANTS ---
const DIALOGS = {
  NONE: null,
  ADD: "ADD",
  EDIT: "EDIT",
  VIEW: "VIEW",
  DELETE: "DELETE",
};
const VEHICLE_COLLECTION_PATH = "Vehicles";

const VEHICLE_TYPES = [
  "Cold Storage",
  "Container",
  "Open Truck",
  "Trailer",
  "Truck",
];

const initialFormState = {
  company_name: "", // First field - will be auto-filled and disabled
  vehicle_type: "",
  subtype: "",
  capacity: "",
  capacity_unit: "Ton", // New field for unit selection
  available_wheels: "",
  price_per_kg: "",
  price_per_tonne: "",
};

// --- API/SERVICE LAYER ---
const vehicleService = {
  
  getCompanyName: async (userId) => {
    if (!userId) return "";
    
    try {
      // First, try to get company info from companies collection
      const companiesRef = collection(db, "companies");
      const companiesQuery = query(companiesRef, where("userId", "==", userId));
      const companiesSnap = await getDocs(companiesQuery);
      
      if (!companiesSnap.empty) {
        const companyDoc = companiesSnap.docs[0];
        const companyData = companyDoc.data();
        return companyData.companyName || companyData.company_name || "";
      }
      
      // If not found in companies, try users collection
      const usersRef = collection(db, "users");
      const usersQuery = query(usersRef, where("userId", "==", userId));
      const usersSnap = await getDocs(usersQuery);
      
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const userData = userDoc.data();
        return userData.companyName || userData.company_name || "";
      }
      
      return "";
    } catch (error) {
      console.error("Error fetching company name:", error);
      return "";
    }
  },
  
  getVehicles: async (userId) => {
    if (!userId) return [];
    
    console.log("🔍 Fetching vehicles for userId:", userId);
    
    try {
      const allVehicles = [];
      const vehiclesRef = collection(db, VEHICLE_COLLECTION_PATH);
      const vehiclesSnap = await getDocs(vehiclesRef);
      
      console.log("📦 Vehicle types found:", vehiclesSnap.docs.map(d => d.id));
      
      if (vehiclesSnap.empty) {
        console.log("⚠️ Vehicles collection is empty!");
        return [];
      }
      
      // Iterate through vehicle types (Trailer, Truck, etc.)
      for (const vehicleTypeDoc of vehiclesSnap.docs) {
        const vehicleType = vehicleTypeDoc.id;
        const companiesRef = collection(db, VEHICLE_COLLECTION_PATH, vehicleType, "Companies");
        
        try {
          const companiesSnap = await getDocs(companiesRef);
          console.log(`  📁 ${vehicleType} - Companies:`, companiesSnap.docs.map(d => d.id));
          
          // Iterate through companies
          for (const companyDoc of companiesSnap.docs) {
            const companyName = companyDoc.id;
            const subtypesRef = collection(db, VEHICLE_COLLECTION_PATH, vehicleType, "Companies", companyName, "subtypes");
            
            try {
              const subtypesSnap = await getDocs(subtypesRef);
              console.log(`    🚗 ${vehicleType}/${companyName} - Subtypes:`, subtypesSnap.docs.map(d => d.id));
              
              // Iterate through subtypes
              for (const subtypeDoc of subtypesSnap.docs) {
                const vehicleData = subtypeDoc.data();
                console.log(`      📄 Data:`, vehicleData);
                console.log(`      🔐 Vehicle userId: "${vehicleData.userId}" vs Your userId: "${userId}"`);
                
                // Only include vehicles belonging to this user
                if (vehicleData.userId === userId) {
                  console.log(`      ✅ MATCH! Adding vehicle`);
                  allVehicles.push({
                    id: `${vehicleType}_${companyName}_${subtypeDoc.id}`,
                    ...vehicleData,
                  });
                } else {
                  console.log(`      ❌ NO MATCH! userId doesn't match`);
                }
              }
            } catch (err) {
              console.error(`Error fetching subtypes:`, err);
            }
          }
        } catch (err) {
          console.error(`Error fetching companies:`, err);
        }
      }
      
      console.log(`\n🎯 Total vehicles found: ${allVehicles.length}`);
      return allVehicles;
    } catch (error) {
      console.error("❌ Error fetching vehicles:", error);
      return [];
    }
  },


  saveVehicle: async (vehicleData, originalVehicle, userId) => {
    if (!userId) throw new Error("User not authenticated");
    
    const { vehicle_type, company_name, subtype, capacity, capacity_unit, available_wheels, price_per_kg, price_per_tonne } = vehicleData;
    
    if (!vehicle_type || !company_name || !subtype) {
      throw new Error("Vehicle type, company name, and subtype are required");
    }
    
    // Sanitize strings to remove any special characters or formatting
    const sanitizeString = (str) => {
      if (!str) return "";
      // Remove extra spaces, trim, and ensure plain text
      return String(str).trim().replace(/\s+/g, ' ');
    };
    
    // Clean all string fields
    const cleanVehicleType = sanitizeString(vehicle_type);
    const cleanCompanyName = sanitizeString(company_name);
    const cleanSubtype = sanitizeString(subtype);
    
    console.log("💾 Saving vehicle...");
    console.log("   Vehicle Type:", cleanVehicleType);
    console.log("   Company Name:", cleanCompanyName);
    console.log("   Subtype:", cleanSubtype);
    
    // Create the nested structure: Vehicles/{type}/Companies/{company}/subtypes/{subtype}
    // We need to ensure intermediate documents exist
    const vehicleTypeDocRef = doc(db, VEHICLE_COLLECTION_PATH, cleanVehicleType);
    const companyDocRef = doc(db, VEHICLE_COLLECTION_PATH, cleanVehicleType, "Companies", cleanCompanyName);
    const subtypeDocRef = doc(db, VEHICLE_COLLECTION_PATH, cleanVehicleType, "Companies", cleanCompanyName, "subtypes", cleanSubtype);
    
    const vehicleDataToSave = {
      vehicle_type: cleanVehicleType,
      company_name: cleanCompanyName,
      subtype: cleanSubtype,
      capacity: sanitizeString(capacity),
      capacity_unit: sanitizeString(capacity_unit || "Ton"),
      available_wheels: sanitizeString(available_wheels),
      price_per_kg: sanitizeString(price_per_kg),
      price_per_tonne: sanitizeString(price_per_tonne),
      userId: userId.trim(),
      createdAt: new Date().toISOString(),
    };
    
    console.log("� Data to save:", vehicleDataToSave);
    
    // Save the actual data in the subtype document
    await setDoc(subtypeDocRef, vehicleDataToSave);
    
    // Also create placeholder docs for the intermediate path (so collections show up)
    await setDoc(vehicleTypeDocRef, { _placeholder: true }, { merge: true });
    await setDoc(companyDocRef, { _placeholder: true }, { merge: true });
    
    console.log("✅ Vehicle saved successfully!");
    
    // If editing and the path changed, delete the old document
    if (originalVehicle) {
      const oldCleanVehicleType = sanitizeString(originalVehicle.vehicle_type);
      const oldCleanCompanyName = sanitizeString(originalVehicle.company_name);
      const oldCleanSubtype = sanitizeString(originalVehicle.subtype);
      
      if (
        oldCleanVehicleType !== cleanVehicleType ||
        oldCleanCompanyName !== cleanCompanyName ||
        oldCleanSubtype !== cleanSubtype
      ) {
        const oldSubtypeDocRef = doc(db, VEHICLE_COLLECTION_PATH, oldCleanVehicleType, "Companies", oldCleanCompanyName, "subtypes", oldCleanSubtype);
        await deleteDoc(oldSubtypeDocRef);
        console.log("🗑️ Deleted old vehicle document");
      }
    }
  },


  deleteVehicle: async (vehicle) => {
    const { vehicle_type, company_name, subtype } = vehicle;
    
    if (!vehicle_type || !company_name || !subtype) {
      throw new Error("Cannot delete vehicle: missing required fields");
    }
    
    const vehiclePath = `${VEHICLE_COLLECTION_PATH}/${vehicle_type}/Companies/${company_name}/subtypes`;
    const vehicleRef = doc(db, vehiclePath, subtype);
    await deleteDoc(vehicleRef);
  },
};


const initialState = {
  vehicles: [],
  loading: true,
  companyName: "",
  snackbar: { open: false, message: "", type: "success" },
  activeDialog: DIALOGS.NONE,
  selectedVehicle: null,
};

function vehicleReducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, vehicles: action.payload };
    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        snackbar: { open: true, message: action.payload, type: "error" },
      };
    case "SET_COMPANY_NAME":
      return { ...state, companyName: action.payload };
    case "OPEN_DIALOG":
      return {
        ...state,
        activeDialog: action.payload.dialog,
        selectedVehicle: action.payload.vehicle || null,
      };
    case "CLOSE_DIALOG":
      return { ...state, activeDialog: DIALOGS.NONE, selectedVehicle: null };
    case "SHOW_SNACKBAR":
      return { ...state, snackbar: { open: true, ...action.payload } };
    case "HIDE_SNACKBAR":
      return { ...state, snackbar: { ...state.snackbar, open: false } };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// --- SANITIZE HELPER ---
const sanitize = (text) => (text || "").toString().trim().toLowerCase();

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

// --- MAIN COMPONENT ---
const VehicleManagement = () => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(vehicleReducer, initialState);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAndSetVehicles = useCallback(async () => {
    if (!user) return;
    
    dispatch({ type: "FETCH_START" });
    try {
      const data = await vehicleService.getVehicles(user.uid);
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        payload: `Failed to fetch vehicles: ${error.message}`,
      });
    }
  }, [user]);

  useEffect(() => {
    fetchAndSetVehicles();
  }, [fetchAndSetVehicles]);

  // Fetch company name on mount
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (!user) return;
      try {
        const name = await vehicleService.getCompanyName(user.uid);
        dispatch({ type: "SET_COMPANY_NAME", payload: name });
      } catch (error) {
        console.error("Failed to fetch company name:", error);
        dispatch({
          type: "SHOW_SNACKBAR",
          payload: { message: "Could not fetch company name", type: "warning" },
        });
      }
    };
    fetchCompanyName();
  }, [user]);

  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return state.vehicles;
    const lowercasedQuery = sanitize(searchQuery);
    return state.vehicles.filter(
      (v) =>
        !v.isPlaceholder &&
        Object.values(v).some((val) => sanitize(val).includes(lowercasedQuery))
    );
  }, [state.vehicles, searchQuery]);

  // --- Handlers ---
  const handleDialogClose = () => dispatch({ type: "CLOSE_DIALOG" });
  const handleSnackbarClose = () => dispatch({ type: "HIDE_SNACKBAR" });

  const handleSave = async (formData, originalVehicle) => {
    if (!user) {
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: { message: "User not authenticated", type: "error" },
      });
      return;
    }
    
    try {
      await vehicleService.saveVehicle(formData, originalVehicle, user.uid);
      handleDialogClose();
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: { message: "Vehicle saved successfully!", type: "success" },
      });
      await fetchAndSetVehicles();
    } catch (error) {
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: {
          message: `Error saving vehicle: ${error.message}`,
          type: "error",
        },
      });
    }
  };

  const handleDelete = async () => {
    if (!state.selectedVehicle) return;
    try {
      await vehicleService.deleteVehicle(state.selectedVehicle);
      handleDialogClose();
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: { message: "Vehicle deleted successfully.", type: "warning" },
      });
      await fetchAndSetVehicles();
    } catch (error) {
      dispatch({
        type: "SHOW_SNACKBAR",
        payload: {
          message: `Error deleting vehicle: ${error.message}`,
          type: "error",
        },
      });
    }
  };

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view vehicles</Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Vehicle Management
      </Typography>

      <VehicleToolbar
        onAdd={() =>
          dispatch({ type: "OPEN_DIALOG", payload: { dialog: DIALOGS.ADD } })
        }
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        searchQuery={searchQuery}
      />

      <Paper elevation={3} sx={{ mt: 3, overflowX: "auto" }}>
        <VehicleTable
          vehicles={filteredVehicles}
          loading={state.loading}
          onView={(vehicle) =>
            dispatch({
              type: "OPEN_DIALOG",
              payload: { dialog: DIALOGS.VIEW, vehicle },
            })
          }
          onEdit={(vehicle) =>
            dispatch({
              type: "OPEN_DIALOG",
              payload: { dialog: DIALOGS.EDIT, vehicle },
            })
          }
          onDelete={(vehicle) =>
            dispatch({
              type: "OPEN_DIALOG",
              payload: { dialog: DIALOGS.DELETE, vehicle },
            })
          }
        />
      </Paper>

 
      <VehicleFormDialog
        open={
          state.activeDialog === DIALOGS.ADD ||
          state.activeDialog === DIALOGS.EDIT
        }
        onClose={handleDialogClose}
        onSubmit={handleSave}
        vehicle={state.selectedVehicle}
        isEditMode={state.activeDialog === DIALOGS.EDIT}
        companyName={state.companyName}
      />
      <ViewVehicleDialog
        open={state.activeDialog === DIALOGS.VIEW}
        onClose={handleDialogClose}
        vehicle={state.selectedVehicle}
      />
      <ConfirmDeleteDialog
        open={state.activeDialog === DIALOGS.DELETE}
        onClose={handleDialogClose}
        onConfirm={handleDelete}
      />
      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={state.snackbar.type}
          sx={{ width: "100%" }}
        >
          {state.snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};


function VehicleToolbar({ onAdd, onSearchChange, searchQuery }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      justifyContent="space-between"
      mt={4}
    >
      <TextField
        label="Search Vehicles"
        size="small"
        value={searchQuery}
        onChange={onSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ width: { xs: "100%", md: 300 } }}
      />
      <Button startIcon={<AddCircleIcon />} variant="contained" onClick={onAdd}>
        Add Vehicle
      </Button>
    </Stack>
  );
}

function VehicleTable({ vehicles, loading, onView, onEdit, onDelete }) {
  const tableHeaders = [
    "Company Name",
    "Subtype",
    "Vehicle Type",
    "Capacity",
    "Wheels",
    "Price/kg",
    "Price/tonne",
    "Actions",
  ];

  return (
    <TableContainer>
      <Table>
        <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
          <TableRow>
            {tableHeaders.map((header) => (
              <TableCell key={header}>
                <b>{header}</b>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={tableHeaders.length} align="center">
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={tableHeaders.length} align="center">
                No vehicles found.
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell>
                  {v.company_url ? (
                    <Link
                      href={v.company_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontWeight: "medium" }}
                    >
                      {v.company_name}
                    </Link>
                  ) : (
                    v.company_name 
                  )}
                </TableCell>
                <TableCell>{v.subtype}</TableCell>
                <TableCell>{v.vehicle_type}</TableCell>
                <TableCell>{v.capacity} {v.capacity_unit || 'Ton'}</TableCell>
                <TableCell>{v.available_wheels}</TableCell>
                <TableCell>{v.price_per_kg}</TableCell>
                <TableCell>{v.price_per_tonne}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0}>
                    <IconButton onClick={() => onView(v)} color="info">
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton onClick={() => onEdit(v)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => onDelete(v)} color="error">
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
  );
}

function VehicleFormDialog({ open, onClose, onSubmit, vehicle, isEditMode, companyName }) {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (isEditMode && vehicle) {
        // Edit mode - use existing vehicle data
        setFormData(vehicle);
      } else {
        // Add mode - use initial state with auto-filled company name
        setFormData({ ...initialFormState, company_name: companyName || "" });
      }
      setErrors({});
    }
  }, [open, vehicle, isEditMode, companyName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const tempErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (!value) tempErrors[key] = "This field is required.";
    });
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData, isEditMode ? vehicle : null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {isEditMode ? "Edit Vehicle" : "Add New Vehicle"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {Object.keys(initialFormState).map((key) => {
            // Skip capacity_unit as it's handled with capacity field
            if (key === "capacity_unit") {
              return null;
            }

            // Render dropdown for vehicle_type
            if (key === "vehicle_type") {
              return (
                <TextField
                  key={key}
                  name={key}
                  label="Vehicle Type"
                  select
                  value={formData[key]}
                  onChange={handleChange}
                  error={!!errors[key]}
                  helperText={errors[key]}
                  fullWidth
                >
                  {VEHICLE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }

            // Special handling for capacity field with unit selector
            if (key === "capacity") {
              return (
                <TextField
                  key={key}
                  name={key}
                  label="Capacity"
                  value={formData[key]}
                  onChange={handleChange}
                  error={!!errors[key]}
                  helperText={errors[key]}
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, step: "any" }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Select
                          name="capacity_unit"
                          value={formData.capacity_unit || "Ton"}
                          onChange={handleChange}
                          sx={{ 
                            minWidth: 80,
                            '& .MuiOutlinedInput-notchedOutline': { border: 0 },
                            '&:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0 }
                          }}
                        >
                          <MenuItem value="Ton">Ton</MenuItem>
                          <MenuItem value="Kg">Kg</MenuItem>
                        </Select>
                      </InputAdornment>
                    )
                  }}
                />
              );
            }
            
            // Numeric fields (only numbers allowed)
            const numericFields = ["available_wheels", "price_per_kg", "price_per_tonne"];
            const isNumericField = numericFields.includes(key);
            
            // Render regular text field for other fields
            return (
              <TextField
                key={key}
                name={key}
                label={key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                value={formData[key]}
                onChange={handleChange}
                error={!!errors[key]}
                helperText={errors[key] || (key === "company_name" ? "Auto-filled from your account" : "")}
                fullWidth
                disabled={key === "company_name"}
                type={isNumericField ? "number" : "text"}
                inputProps={isNumericField ? { min: 0, step: "any" } : {}}
              />
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {isEditMode ? "Save Changes" : "Add Vehicle"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ViewVehicleDialog({ open, onClose, vehicle }) {
  if (!vehicle) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Vehicle Details</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          {Object.entries(vehicle).map(
            ([key, value]) =>
              !["id", "isPlaceholder"].includes(key) && (
                <Typography key={key}>
                  <strong>
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                    :
                  </strong>{" "}
                  {value}
                </Typography>
              )
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ConfirmDeleteDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} TransitionComponent={Transition}>
      <DialogTitle>Confirm Deletion</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete this vehicle? This action cannot be
          undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VehicleManagement;
