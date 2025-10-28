import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Snackbar,
  Alert,
  Chip,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  TextField,
  InputAdornment,
  TableContainer,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Grid,
  Card,
  CardContent,
  Pagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PaymentIcon from "@mui/icons-material/Payment";
import PendingIcon from "@mui/icons-material/Pending";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useTheme } from "@mui/material/styles";
import { db } from "../firebaseConfig";
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

const PaymentSettlement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderToMarkPaid, setSelectedOrderToMarkPaid] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const ordersPerPage = 10;
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // Fetch orders from Firestore - Company wise
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        // First, get the company name for this user
        let companyName = "";
        
        // Try companies collection first
        const companiesRef = collection(db, "companies");
        const companiesQuery = query(companiesRef, where("userId", "==", user.uid));
        const companiesSnap = await getDocs(companiesQuery);
        
        if (!companiesSnap.empty) {
          const companyData = companiesSnap.docs[0].data();
          companyName = companyData.companyName || companyData.company_name || "";
        }
        
        // If not found, try users collection
        if (!companyName) {
          const usersRef = collection(db, "users");
          const usersQuery = query(usersRef, where("userId", "==", user.uid));
          const usersSnap = await getDocs(usersQuery);
          
          if (!usersSnap.empty) {
            const userData = usersSnap.docs[0].data();
            companyName = userData.companyName || userData.company_name || "";
          }
        }
        
        console.log("🏢 Company Name for Payments:", companyName);
        
        // Fetch all orders for this company
        const ordersRef = collection(db, "AllOrders");
        const ordersQuery = query(ordersRef, where("company_name", "==", companyName));
        const snap = await getDocs(ordersQuery);
        
        console.log("💰 Payment orders found:", snap.size);
        
        const all = [];
        snap.forEach((docItem) => {
          const data = docItem.data();
          all.push({
            id: data.order_id || docItem.id,
            bookingId: data.booking_id || "",
            customer: data.user_name || "N/A",
            driver: data.driver_name || "N/A",
            vehicle: data.vehicle_type || "N/A",
            date: data.booking_date
              ? data.booking_date.slice(0, 10)
              : "",
            totalAmount: Number(String(data.total_amount || data.price || 0).replace(/[^\d.]/g, "")) || 0,
            advanceAmount: Number(String(data.advance_amount || 0).replace(/[^\d.]/g, "")) || 0,
            pendingAmount: Number(String(data.pending_amount || 0).replace(/[^\d.]/g, "")) || 0,
            paymentStatus: data.payment_status || "Pending",
            paymentMode: data.payment_mode || "N/A",
            transactionDate: data.transaction_date || "",
          });
        });
        
        console.log("✅ Processed payment orders:", all.length);
        setOrders(all);
      } catch (error) {
        console.error("❌ Error fetching payment orders:", error);
      }
    };
    
    fetchOrders();
  }, [user]);

  const confirmMarkAsPaid = (order) => {
    setSelectedOrderToMarkPaid(order);
    setConfirmDialogOpen(true);
  };

  const handleMarkAsPaidConfirmed = async () => {
    if (!selectedOrderToMarkPaid) return;

    try {
      // Update payment status in Firestore
      await setDoc(
        doc(db, "AllOrders", selectedOrderToMarkPaid.id),
        { 
          payment_status: "Paid",
          pending_amount: "0",
          transaction_date: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update local state
      const updated = orders.map((order) =>
        order.id === selectedOrderToMarkPaid.id
          ? { 
              ...order, 
              paymentStatus: "Paid",
              pendingAmount: 0,
              transactionDate: new Date().toISOString(),
            }
          : order
      );
      setOrders(updated);
      setSnackbar({
        open: true,
        message: `Order #${selectedOrderToMarkPaid.id} marked as paid successfully!`,
        type: "success",
      });
    } catch (error) {
      console.error("Error updating payment:", error);
      setSnackbar({
        open: true,
        message: "Failed to update payment status. Please try again.",
        type: "error",
      });
    }

    setConfirmDialogOpen(false);
    setSelectedOrderToMarkPaid(null);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Calculate payment statistics
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalPaid = orders
    .filter((o) => o.paymentStatus === "Paid" || o.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.totalAmount, 0);
  const totalPending = orders
    .filter((o) => o.paymentStatus !== "Paid" && o.paymentStatus !== "paid")
    .reduce((sum, order) => sum + order.pendingAmount, 0);
  const paidCount = orders.filter((o) => o.paymentStatus === "Paid" || o.paymentStatus === "paid").length;
  const pendingCount = orders.filter((o) => o.paymentStatus !== "Paid" && o.paymentStatus !== "paid").length;

  // Filter and pagination
  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.date);
    const matchStatus =
      statusFilter === "All" || 
      order.paymentStatus.toLowerCase() === statusFilter.toLowerCase();
    const inDateRange =
      (!startDate || orderDate >= startDate) &&
      (!endDate || orderDate <= endDate);
    const matchSearch =
      order.customer.toLowerCase().includes(searchText.toLowerCase()) ||
      order.driver.toLowerCase().includes(searchText.toLowerCase()) ||
      order.id.toString().toLowerCase().includes(searchText.toLowerCase()) ||
      order.bookingId.toLowerCase().includes(searchText.toLowerCase()) ||
      order.date.includes(searchText) ||
      order.totalAmount.toString().includes(searchText);
    return matchStatus && inDateRange && matchSearch;
  });

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view payment settlements</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: { xs: 2, sm: 3, md: 4 } }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          fontSize: { xs: 24, sm: 32, md: 36 }, 
          fontWeight: 600,
          mb: 2 
        }}
      >
        Payment Settlements
      </Typography>
      <hr style={{ marginBottom: "24px", border: "none", borderTop: "2px solid #e0e0e0" }} />

      {/* Summary Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              bgcolor: "#e3f2fd", 
              borderRadius: 2,
              boxShadow: 2,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4,
              }
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                    ₹{totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <CurrencyRupeeIcon sx={{ fontSize: 40, color: "primary.main", opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              bgcolor: "#e8f5e9", 
              borderRadius: 2,
              boxShadow: 2,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4,
              }
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Paid
                  </Typography>
                  <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                    ₹{totalPaid.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {paidCount} orders
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: "success.main", opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              bgcolor: "#fff3e0", 
              borderRadius: 2,
              boxShadow: 2,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4,
              }
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Pending Amount
                  </Typography>
                  <Typography variant="h5" color="warning.main" sx={{ fontWeight: 700 }}>
                    ₹{totalPending.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pendingCount} orders
                  </Typography>
                </Box>
                <PendingIcon sx={{ fontSize: 40, color: "warning.main", opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              bgcolor: "#f3e5f5", 
              borderRadius: 2,
              boxShadow: 2,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4,
              }
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Orders
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#9c27b0" }}>
                    {orders.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    All transactions
                  </Typography>
                </Box>
                <PaymentIcon sx={{ fontSize: 40, color: "#9c27b0", opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Section */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          flexWrap="wrap"
          justifyContent="space-between"
        >
          <TextField
            size="small"
            placeholder="Search by ID, Customer, Driver..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ 
              width: isMobile ? "100%" : 300,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              }
            }}
          />

          <FormControl
            size="small"
            sx={{ minWidth: 150, width: isMobile ? "100%" : "auto" }}
          >
            <InputLabel>Payment Status</InputLabel>
            <Select
              value={statusFilter}
              label="Payment Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Partially Paid">Partially Paid</MenuItem>
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              sx={{ width: isMobile ? "100%" : "auto" }}
            >
              <DatePicker
                label="From Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <DatePicker
                label="To Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Stack>
          </LocalizationProvider>
        </Stack>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>
          Showing {filteredOrders.length} of {orders.length} payment(s)
        </Typography>
      </Paper>

      {/* Table Section */}
      <Paper elevation={3} sx={{ borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: "60vh" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Driver</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Advance</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Pending</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, bgcolor: "#f5f5f5" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentOrders.length > 0 ? (
                currentOrders.map((order) => (
                  <TableRow key={order.id} hover sx={{ "&:hover": { bgcolor: "#f5f5f5" } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {order.id}
                      </Typography>
                      {order.bookingId && (
                        <Typography variant="caption" color="text.secondary">
                          {order.bookingId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.driver}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        ₹{order.totalAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        ₹{order.advanceAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="warning.main" fontWeight={600}>
                        ₹{order.pendingAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.paymentStatus}
                        color={
                          order.paymentStatus === "Paid" || order.paymentStatus === "paid"
                            ? "success"
                            : order.paymentStatus === "Partially Paid"
                            ? "info"
                            : "warning"
                        }
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {order.paymentStatus !== "Paid" && order.paymentStatus !== "paid" ? (
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          onClick={() => confirmMarkAsPaid(order)}
                          sx={{ textTransform: "none", borderRadius: 1.5 }}
                        >
                          Mark as Paid
                        </Button>
                      ) : (
                        <Chip
                          label="✓ Completed"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No payment records found for selected filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size={isMobile ? "small" : "medium"}
              sx={{
                "& .MuiPaginationItem-root": {
                  fontSize: { xs: 14, sm: 16 },
                  fontWeight: 500,
                }
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Payment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark order{" "}
            <strong>#{selectedOrderToMarkPaid?.id}</strong> as paid?
            <br /><br />
            <strong>Amount:</strong> ₹{selectedOrderToMarkPaid?.totalAmount?.toLocaleString()}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialogOpen(false)} sx={{ borderRadius: 1.5 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleMarkAsPaidConfirmed}
            sx={{ borderRadius: 1.5 }}
          >
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.type}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentSettlement;
