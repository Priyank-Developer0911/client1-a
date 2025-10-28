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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import { db } from "../firebaseConfig"; // Adjust the import path as necessary
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from "firebase/firestore";
import Chip from "@mui/material/Chip";
import { useAuth } from "../contexts/AuthContext";

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

const sanitize = (text) =>
  (text || "")
    .toString()
    .replace(/[*_`~]/g, "")
    .trim()
    .toLowerCase();

const initialFormData = {
  advance_amount: "",
  available_wheel: "",
  booking_date: "",
  booking_id: "",
  booking_status: "",
  capacity: "",
  company_name: "",
  createdAt: "",
  dest_lat: "",
  dest_lng: "",
  destination_address: "",
  distance: "",
  from_address: "",
  from_lat: "",
  from_lng: "",
  load: "",
  material: "",
  material_quantity: "",
  odc_breadth: "",
  odc_consignment: "",
  odc_height: "",
  odc_length: "",
  order_id: "",
  order_status: "",
  payment_id: "",
  payment_mode: "",
  payment_percentage: "",
  payment_status: "",
  pending_amount: "",
  price: "",
  status: "",
  subtype_vehicle: "",
  total_amount: "",
  transaction_date: "",
  user_email: "",
  user_name: "",
  user_phone: "",
  vehicle_type: "",
};

// Status filter options
const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

const OrderManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
    order: null,
  });
  const [loading, setLoading] = useState(true);
  const [editOriginal, setEditOriginal] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Fetch company name from users or companies collection
  const fetchCompanyName = useCallback(async () => {
    if (!user) return null;
    
    try {
      // First, try to get company info from companies collection
      const companiesRef = collection(db, "companies");
      const companiesQuery = query(companiesRef, where("userId", "==", user.uid));
      const companiesSnap = await getDocs(companiesQuery);
      
      if (!companiesSnap.empty) {
        const companyDoc = companiesSnap.docs[0];
        const companyData = companyDoc.data();
        return companyData.companyName || companyData.company_name || "";
      }
      
      // If not found in companies, try users collection
      const usersRef = collection(db, "users");
      const usersQuery = query(usersRef, where("userId", "==", user.uid));
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
  }, [user]);

  // Fetch orders from Firestore based on company name
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First get the company name
      const fetchedCompanyName = await fetchCompanyName();
      setCompanyName(fetchedCompanyName);
      
      if (!fetchedCompanyName) {
        setSnackbar({
          open: true,
          message: "Company information not found. Please complete your profile.",
          type: "warning",
        });
        setOrders([]);
        setLoading(false);
        return;
      }
      
      // Fetch orders where company_name matches
      const ordersRef = collection(db, "AllOrders");
      const ordersQuery = query(
        ordersRef, 
        where("company_name", "==", fetchedCompanyName)
      );
      const ordersSnap = await getDocs(ordersQuery);
      
      let allOrders = [];
      ordersSnap.forEach((doc) => {
        allOrders.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort orders by booking_date or createdAt (newest first)
      allOrders.sort((a, b) => {
        const dateA = a.booking_date || a.createdAt || "";
        const dateB = b.booking_date || b.createdAt || "";
        return dateB.localeCompare(dateA);
      });
      
      setOrders(allOrders);
      
      if (allOrders.length === 0) {
        setSnackbar({
          open: true,
          message: `No orders found for company: ${fetchedCompanyName}`,
          type: "info",
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setSnackbar({
        open: true,
        message: "Error fetching orders: " + error.message,
        type: "error",
      });
    }
    setLoading(false);
  }, [user, fetchCompanyName]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Enhanced filtering logic that includes both search and status filter
  useEffect(() => {
    let filteredOrders = orders;

    // Apply search filter
    if (search) {
      const lower = sanitize(search);
      filteredOrders = filteredOrders.filter((o) =>
        [
          o.order_id,
          o.booking_id,
          o.user_name,
          o.user_phone,
          o.company_name,
          o.booking_status,
          o.order_status,
          o.vehicle_type,
          o.subtype_vehicle,
          o.material,
          o.destination_address,
          o.from_address,
          o.driver_name,
          o.completed_by_driver,
          o.driver_id,
          o.load,
          o.capacity,
        ].some((field) => sanitize(String(field)).includes(lower))
      );
    }

    // Apply status filter
    if (statusFilter) {
      filteredOrders = filteredOrders.filter((o) => {
        const orderStatus = sanitize(o.order_status);
        const bookingStatus = sanitize(o.booking_status);
        const filterValue = sanitize(statusFilter);
        
        // Check both order_status and booking_status fields
        return orderStatus === filterValue || bookingStatus === filterValue;
      });
    }

    setFiltered(filteredOrders);
  }, [search, statusFilter, orders]);

  // ========================================
  // UPDATED: openForm function - now only used for editing orders
  // Add functionality has been removed
  // Date: October 28, 2025
  // ========================================
  const openForm = (mode, order = null) => {
    setFormMode(mode);
    setFormData(order || initialFormData);
    setErrors({});
    setDialogOpen(true);
    setEditOriginal(order ? order.id : "");
  };

  const closeForm = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
  };

  const validate = () => {
    const temp = {
      order_id: formData.order_id ? "" : "Required",
      user_name: formData.user_name ? "" : "Required",
      user_phone: formData.user_phone ? "" : "Required",
      company_name: formData.company_name ? "" : "Required",
      booking_status: formData.booking_status ? "" : "Required",
      order_status: formData.order_status ? "" : "Required",
      vehicle_type: formData.vehicle_type ? "" : "Required",
      material: formData.material ? "" : "Required",
      destination_address: formData.destination_address ? "" : "Required",
    };
    setErrors(temp);
    return Object.values(temp).every((x) => x === "");
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
      const orderData = { ...formData, userId: user.uid };
      const orderDocRef = doc(db, "AllOrders", formData.order_id);
      await setDoc(orderDocRef, orderData, { merge: true });
      await fetchOrders();
      setSnackbar({
        open: true,
        message: "Order saved successfully",
        type: "success",
      });
      closeForm();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error saving order: " + error.message,
        type: "error",
      });
    }
  };

  const handleDeleteConfirm = (order) => {
    setConfirmDialog({ open: true, action: "delete", order });
  };

  const handleEditConfirm = (order) => {
    openForm("edit", order);
  };

  const handleConfirmAction = async () => {
    const { action, order } = confirmDialog;
    if (action === "delete") {
      try {
        await deleteDoc(doc(db, "AllOrders", order.id));
        await fetchOrders();
        setSnackbar({ open: true, message: "Order deleted", type: "warning" });
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Error deleting: " + error.message,
          type: "error",
        });
      }
    }
    setConfirmDialog({ open: false, action: "", order: null });
  };

  const handleView = (order) => {
    setViewData(order);
    setViewDialogOpen(true);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  // Helper for status color
  const getStatusColor = (status) => {
    switch (sanitize(status)) {
      case "pending":
        return "warning";
      case "confirmed":
        return "info";
      case "in-progress":
        return "primary";
      case "completed":
        return "success";
      case "cancelled":
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  const getPaymentColor = (status) => {
    switch (sanitize(status)) {
      case "partially paid":
        return "warning";
      case "full paid":
        return "success";
      case "pending":
        return "error";
      default:
        return "default";
    }
  };

  // Count orders by status for filter display
  const getStatusCount = (status) => {
    if (!status) return orders.length;
    return orders.filter(o => 
      sanitize(o.order_status) === sanitize(status) || 
      sanitize(o.booking_status) === sanitize(status)
    ).length;
  };

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view orders</Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 40 } }}>
          Order Management
        </Typography>
        {companyName && (
          <Chip 
            label={`Company: ${companyName}`} 
            color="primary" 
            variant="outlined"
            sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600 }}
          />
        )}
      </Stack>

      {/* Search and Filter Controls */}
      <Box sx={{ mt: 4, mb: 3 }}>
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          alignItems={isMobile ? "stretch" : "center"}
          justifyContent="space-between"
          mb={2}
        >
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={2} 
            sx={{ width: isMobile ? "100%" : "auto" }}
          >
            <TextField
              label="Search Orders"
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
            
            <FormControl size="small" sx={{ width: isMobile ? "100%" : 200 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Filter by Status"
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListIcon sx={{ fontSize: 18, ml: 1 }} />
                  </InputAdornment>
                }
              >
                {STATUS_FILTERS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Stack direction="row" justifyContent="space-between" width="100%">
                      <span>{option.label}</span>
                      <Chip 
                        label={getStatusCount(option.value)} 
                        size="small" 
                        color="primary"
                        sx={{ ml: 1, minWidth: 40 }}
                      />
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(search || statusFilter) && (
              <Button
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                variant="outlined"
                size="small"
                sx={{ height: 40 }}
              >
                Clear Filters
              </Button>
            )}
          </Stack>

          {/* ========================================
              COMMENTED OUT: Add Order Button
              Reason: Removed "Add Order" functionality from frontend
              Date: October 28, 2025
              ========================================
          <Button
            startIcon={<AddCircleIcon />}
            variant="contained"
            fullWidth={isMobile}
            onClick={() => openForm("add")}
          >
            Add Order
          </Button>
          */}
        </Stack>

        {/* Active Filters Display */}
        {(search || statusFilter) && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Active Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {search && (
                <Chip
                  label={`Search: "${search}"`}
                  onDelete={() => setSearch("")}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {statusFilter && (
                <Chip
                  label={`Status: ${STATUS_FILTERS.find(f => f.value === statusFilter)?.label}`}
                  onDelete={() => setStatusFilter("")}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}
      </Box>

      <Paper elevation={3} sx={{ mt: 3, overflowX: "auto" }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><strong>Order ID</strong></TableCell>
                <TableCell><strong>Booking ID</strong></TableCell>
                <TableCell><strong>Driver Name</strong></TableCell>
                <TableCell><strong>Material</strong></TableCell>
                <TableCell><strong>Load/Capacity</strong></TableCell>
                <TableCell><strong>Booking Status</strong></TableCell>
                <TableCell><strong>Vehicle Type</strong></TableCell>
                <TableCell><strong>From → To</strong></TableCell>
                <TableCell><strong>Distance</strong></TableCell>
                <TableCell><strong>Booking Date</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography>Loading orders...</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    {search || statusFilter ? "No orders match the current filters." : "No orders found for your company."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.order_id || "N/A"}</TableCell>
                    <TableCell>{order.booking_id || "N/A"}</TableCell>
                    <TableCell>{order.driver_name || order.completed_by_driver || "Not Assigned"}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {order.material || "N/A"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.material_quantity ? `Qty: ${order.material_quantity}` : ""}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.load || order.capacity || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.booking_status || "Unknown"}
                        color={getStatusColor(order.booking_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {order.vehicle_type || "N/A"}
                        </Typography>
                        {order.subtype_vehicle && (
                          <Typography variant="caption" color="text.secondary">
                            {order.subtype_vehicle}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 200 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          From: {order.from_address || "N/A"}
                        </Typography>
                        <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                          To: {order.destination_address || "N/A"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.distance ? `${order.distance} km` : "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {order.booking_date ? new Date(order.booking_date).toLocaleDateString() : "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton onClick={() => handleView(order)} color="info" size="small">
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton onClick={() => handleEditConfirm(order)} color="primary" size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteConfirm(order)} color="error" size="small">
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

      {/* Results Summary */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filtered.length} of {orders.length} orders
          {(search || statusFilter) && " (filtered)"}
        </Typography>
      </Box>

      {/* ========================================
          UPDATED: Edit Order Dialog (Add Order functionality removed)
          Date: October 28, 2025
          ========================================
      */}
      {/* Edit Order Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeForm}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Edit Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {Object.keys(initialFormData).map((field) => (
              <TextField
                key={field}
                label={field.replace(/_/g, " ")}
                value={formData[field]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                error={!!errors[field]}
                helperText={errors[field]}
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Order Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Order Details</Typography>
            {viewData && (
              <Chip
                label={viewData.booking_status || "Unknown"}
                color={getStatusColor(viewData.booking_status)}
                size="small"
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {viewData && (
            <Stack spacing={3}>
              {/* Order Information */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                  📋 Order Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Order ID:</strong> {viewData.order_id || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Booking ID:</strong> {viewData.booking_id || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Booking Date:</strong>{" "}
                    {viewData.booking_date
                      ? new Date(viewData.booking_date).toLocaleString()
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Company Name:</strong> {viewData.company_name || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Booking Status:</strong>{" "}
                    <Chip
                      label={viewData.booking_status || "Unknown"}
                      color={getStatusColor(viewData.booking_status)}
                      size="small"
                    />
                  </Typography>
                </Stack>
              </Paper>

              {/* Driver & Vehicle Information */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                  🚛 Driver & Vehicle Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Driver Name:</strong>{" "}
                    {viewData.driver_name || viewData.completed_by_driver || "Not Assigned"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Driver ID:</strong> {viewData.driver_id || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Vehicle Type:</strong> {viewData.vehicle_type || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Vehicle Subtype:</strong> {viewData.subtype_vehicle || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Capacity:</strong> {viewData.capacity || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Available Wheels:</strong> {viewData.available_wheel || "N/A"}
                  </Typography>
                </Stack>
              </Paper>

              {/* Material & Load Information */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                  📦 Material & Load Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Material:</strong> {viewData.material || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Material Quantity:</strong> {viewData.material_quantity || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Load:</strong> {viewData.load || "N/A"}
                  </Typography>
                  {viewData.odc_consignment && (
                    <>
                      <Typography variant="body2">
                        <strong>ODC Consignment:</strong> {viewData.odc_consignment}
                      </Typography>
                      <Typography variant="body2">
                        <strong>ODC Dimensions:</strong> L: {viewData.odc_length || "N/A"} × W:{" "}
                        {viewData.odc_breadth || "N/A"} × H: {viewData.odc_height || "N/A"}
                      </Typography>
                    </>
                  )}
                </Stack>
              </Paper>

              {/* Location & Route Information */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                  📍 Location & Route Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>From Address:</strong> {viewData.from_address || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>From Coordinates:</strong>{" "}
                    {viewData.from_lat && viewData.from_lng
                      ? `${viewData.from_lat}, ${viewData.from_lng}`
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>To Address:</strong> {viewData.destination_address || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>To Coordinates:</strong>{" "}
                    {viewData.dest_lat && viewData.dest_lng
                      ? `${viewData.dest_lat}, ${viewData.dest_lng}`
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Distance:</strong> {viewData.distance ? `${viewData.distance} km` : "N/A"}
                  </Typography>
                </Stack>
              </Paper>

              {/* Driver Location (if available) */}
              {viewData.driverLocation && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: "#fff3cd" }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom color="warning.main">
                    🗺️ Current Driver Location
                  </Typography>
                  <Stack spacing={1}>
                    {viewData.driverLocation[0] && (
                      <Typography variant="body2">
                        <strong>Coordinates:</strong> {viewData.driverLocation[0]},{" "}
                        {viewData.driverLocation[1]}
                      </Typography>
                    )}
                    {viewData.driver_current_location && (
                      <>
                        <Typography variant="body2">
                          <strong>Last Updated:</strong>{" "}
                          {viewData.driver_current_location.last_updated
                            ? new Date(
                                viewData.driver_current_location.last_updated
                              ).toLocaleString()
                            : "N/A"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Latitude:</strong>{" "}
                          {viewData.driver_current_location.latitude || "N/A"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Longitude:</strong>{" "}
                          {viewData.driver_current_location.longitude || "N/A"}
                        </Typography>
                      </>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Payment Information */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                  💰 Payment Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Total Amount:</strong> ₹{viewData.total_amount || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Advance Amount:</strong> ₹{viewData.advance_amount || "0"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Pending Amount:</strong> ₹{viewData.pending_amount || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Payment Mode:</strong> {viewData.payment_mode || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Payment Status:</strong>{" "}
                    <Chip
                      label={viewData.payment_status || "Unknown"}
                      color={getPaymentColor(viewData.payment_status)}
                      size="small"
                    />
                  </Typography>
                  <Typography variant="body2">
                    <strong>Payment ID:</strong> {viewData.payment_id || "N/A"}
                  </Typography>
                </Stack>
              </Paper>

              {/* Timestamps */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                  🕒 Timestamps
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Created At:</strong>{" "}
                    {viewData.createdAt
                      ? new Date(viewData.createdAt).toLocaleString()
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Accepted At:</strong>{" "}
                    {viewData.accepted_at
                      ? new Date(viewData.accepted_at).toLocaleString()
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Completed Date:</strong>{" "}
                    {viewData.completed_date
                      ? new Date(viewData.completed_date).toLocaleString()
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Delivery Date:</strong>{" "}
                    {viewData.delivery_date
                      ? new Date(viewData.delivery_date).toLocaleString()
                      : "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Last Location Update:</strong>{" "}
                    {viewData.lastLocationUpdate
                      ? new Date(viewData.lastLocationUpdate).toLocaleString()
                      : "N/A"}
                  </Typography>
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
              ? "Are you sure you want to delete this order? This action cannot be undone."
              : "Are you sure you want to proceed with this action?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
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

export default OrderManagement;