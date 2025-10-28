import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Tabs,
  Tab,
  Box,
  Switch,
  FormControlLabel,
  useMediaQuery,
  Stack,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Pagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useTheme } from "@mui/material/styles";
import { db } from "../firebaseConfig"; // Adjust the import path as necessary
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const TrackingUpdates = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoCenter, setAutoCenter] = useState(true);
  const [search, setSearch] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6; // Show 6 orders per page

  // Fetch orders from Firestore
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
        
        console.log("🏢 Company Name:", companyName);
        
        // Fetch all orders for this company
        const ordersRef = collection(db, "AllOrders");
        const ordersQuery = query(ordersRef, where("company_name", "==", companyName));
        const snap = await getDocs(ordersQuery);
        
        console.log("📦 Orders found:", snap.size);
        
        const all = [];
        snap.forEach((docItem) => {
          const data = docItem.data();
          
          // Parse driver location if available
          let driverLat = 0;
          let driverLng = 0;
          
          if (data.driver_current_location) {
            driverLat = Number(data.driver_current_location.latitude) || 0;
            driverLng = Number(data.driver_current_location.longitude) || 0;
          } else if (data.driverLocation && Array.isArray(data.driverLocation)) {
            driverLat = Number(data.driverLocation[0]) || 0;
            driverLng = Number(data.driverLocation[1]) || 0;
          }
          
          // Use driver location if available, otherwise use destination
          const currentLat = driverLat || Number(data.dest_lat) || 0;
          const currentLng = driverLng || Number(data.dest_lng) || 0;
          
          all.push({
            id: data.order_id || docItem.id,
            bookingId: data.booking_id || "",
            driver: data.driver_name || data.user_name || "Unknown",
            driverPhone: data.driver_id || data.user_phone || "",
            vehicle: data.vehicle_type || "Unknown",
            vehicleSubtype: data.subtype_vehicle || "",
            material: data.material || "",
            quantity: data.material_quantity || "",
            fromAddress: data.from_address || "",
            toAddress: data.destination_address || "",
            location: {
              lat: currentLat,
              lng: currentLng,
            },
            status: data.order_status || data.status || "Unknown",
            bookingStatus: data.booking_status || "",
            lastUpdated: data.lastLocationUpdate || data.booking_date || new Date().toISOString(),
            route: [
              {
                lat: Number(data.from_lat) || 0,
                lng: Number(data.from_lng) || 0,
              },
              {
                lat: currentLat,
                lng: currentLng,
              },
              {
                lat: Number(data.dest_lat) || 0,
                lng: Number(data.dest_lng) || 0,
              },
            ].filter(point => point.lat !== 0 && point.lng !== 0),
          });
        });
        
        console.log("✅ Processed orders:", all);
        setOrders(all);
        setFilteredOrders(all);
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
      }
    };
    
    fetchOrders();
  }, [user]);

  // Filter orders by status and search
  useEffect(() => {
    const lower = search.trim().toLowerCase();
    let filtered = orders;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply search filter
    if (lower) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(lower) ||
          order.bookingId.toLowerCase().includes(lower) ||
          order.driver.toLowerCase().includes(lower) ||
          order.vehicle.toLowerCase().includes(lower) ||
          order.material.toLowerCase().includes(lower)
      );
    }

    setFilteredOrders(filtered);
    setActiveIdx(0); // Reset active tab
    setCurrentPage(1); // Reset to first page
  }, [search, orders, statusFilter]);

  // Get status icon and color
  const getStatusConfig = (status) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "completed":
        return { icon: <CheckCircleIcon />, color: "success", label: "Completed" };
      case "confirmed":
        return { icon: <LocalShippingIcon />, color: "primary", label: "Confirmed" };
      case "in_transit":
      case "in transit":
        return { icon: <LocalShippingIcon />, color: "info", label: "In Transit" };
      case "pending":
        return { icon: <HourglassEmptyIcon />, color: "warning", label: "Pending" };
      case "cancelled":
        return { icon: <CancelIcon />, color: "error", label: "Cancelled" };
      default:
        return { icon: <LocalShippingIcon />, color: "default", label: status };
    }
  };

  // Pagination logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    setActiveIdx(0);
  };

  const activeOrder = currentOrders[activeIdx] || {};

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view tracking updates</Typography>
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
        Real‑Time Order Tracking
      </Typography>
      <hr style={{ marginBottom: "24px", border: "none", borderTop: "2px solid #e0e0e0" }} />

      {/* Summary Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card 
            sx={{ 
              bgcolor: "#e3f2fd", 
              textAlign: "center", 
              p: { xs: 1.5, sm: 2, md: 2.5 },
              borderRadius: 2,
              boxShadow: 2,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4,
              }
            }}
          >
            <Typography variant="h4" color="primary" sx={{ fontSize: { xs: 24, sm: 32, md: 36 }, fontWeight: 700 }}>
              {orders.length}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: 11, sm: 13, md: 14 } }}>
              Total Orders
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card 
            sx={{ 
              bgcolor: "#e8f5e9", 
              textAlign: "center", 
              p: { xs: 1.5, sm: 2, md: 2.5 },
              borderRadius: 2,
              boxShadow: 2,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4,
              }
            }}
          >
            <Typography variant="h4" color="success.main" sx={{ fontSize: { xs: 24, sm: 32, md: 36 }, fontWeight: 700 }}>
              {orders.filter((o) => o.status.toLowerCase() === "completed").length}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: 11, sm: 13, md: 14 } }}>
              Completed
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card 
            sx={{ 
              bgcolor: "#fff3e0", 
              textAlign: "center", 
              p: { xs: 1.5, sm: 2, md: 2.5 },
              borderRadius: 2,
              boxShadow: 2,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4,
              }
            }}
          >
            <Typography variant="h4" color="warning.main" sx={{ fontSize: { xs: 24, sm: 32, md: 36 }, fontWeight: 700 }}>
              {orders.filter((o) => o.status.toLowerCase() === "in_transit" || o.status.toLowerCase() === "in transit").length}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: 11, sm: 13, md: 14 } }}>
              In Transit
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card 
            sx={{ 
              bgcolor: "#fce4ec", 
              textAlign: "center", 
              p: { xs: 1.5, sm: 2, md: 2.5 },
              borderRadius: 2,
              boxShadow: 2,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 4,
              }
            }}
          >
            <Typography variant="h4" color="error.main" sx={{ fontSize: { xs: 24, sm: 32, md: 36 }, fontWeight: 700 }}>
              {orders.filter((o) => o.status.toLowerCase() === "pending").length}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: 11, sm: 13, md: 14 } }}>
              Pending
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={{ xs: 2, sm: 2.5 }}
          alignItems={isMobile ? "stretch" : "center"}
        >
          <TextField
            label="Search Orders"
            placeholder="Order ID, Driver, Vehicle, Material..."
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
            sx={{ 
              flex: 1, 
              minWidth: { xs: "100%", sm: 250, md: 300 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              }
            }}
          />

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Chip
              label="All"
              color={statusFilter === "all" ? "primary" : "default"}
              onClick={() => setStatusFilter("all")}
              sx={{ cursor: "pointer", fontWeight: statusFilter === "all" ? 600 : 400 }}
            />
            <Chip
              label="Completed"
              color={statusFilter === "completed" ? "success" : "default"}
              onClick={() => setStatusFilter("completed")}
              sx={{ cursor: "pointer", fontWeight: statusFilter === "completed" ? 600 : 400 }}
            />
            <Chip
              label="In Transit"
              color={statusFilter === "in_transit" ? "info" : "default"}
              onClick={() => setStatusFilter("in_transit")}
              sx={{ cursor: "pointer", fontWeight: statusFilter === "in_transit" ? 600 : 400 }}
            />
            <Chip
              label="Pending"
              color={statusFilter === "pending" ? "warning" : "default"}
              onClick={() => setStatusFilter("pending")}
              sx={{ cursor: "pointer", fontWeight: statusFilter === "pending" ? 600 : 400 }}
            />
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>
          Showing {filteredOrders.length} of {orders.length} order(s)
        </Typography>
      </Paper>

      {filteredOrders.length === 0 ? (
        <Paper elevation={2} sx={{ p: { xs: 3, sm: 4, md: 5 }, textAlign: "center", borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No orders found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filters
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Order Cards Grid */}
          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: 4 }}>
            {currentOrders.map((order, idx) => {
              const statusConfig = getStatusConfig(order.status);
              const isActive = idx === activeIdx;

              return (
                <Grid item xs={12} sm={6} md={4} key={order.id}>
                  <Card
                    sx={{
                      cursor: "pointer",
                      border: isActive ? 3 : 1,
                      borderColor: isActive ? "primary.main" : "divider",
                      borderRadius: 2,
                      transition: "all 0.3s ease",
                      height: "100%",
                      "&:hover": {
                        boxShadow: 8,
                        transform: "translateY(-6px)",
                        borderColor: "primary.light",
                      },
                    }}
                    onClick={() => setActiveIdx(idx)}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="h6" sx={{ fontSize: { xs: 14, sm: 15, md: 16 }, fontWeight: 600 }}>
                          {order.id}
                        </Typography>
                        <Chip
                          icon={statusConfig.icon}
                          label={statusConfig.label}
                          color={statusConfig.color}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>

                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 0.75 }}>
                        <strong>Driver:</strong> {order.driver}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 0.75 }}>
                        <strong>Vehicle:</strong> {order.vehicle}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1.5 }}>
                        <strong>Material:</strong> {order.material || "N/A"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 1.5,
                          p: 1.5,
                          bgcolor: "#f5f5f5",
                          borderRadius: 1.5,
                          fontSize: { xs: 11, sm: 12 },
                          lineHeight: 1.4,
                        }}
                      >
                        📍 {order.fromAddress} → {order.toAddress}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
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

          {/* Selected Order Details and Map */}
          {activeOrder && activeOrder.id && (
            <>
              <Paper elevation={3} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
                <Stack
                  direction={isMobile ? "column" : "row"}
                  spacing={{ xs: 2, sm: 2.5, md: 3 }}
                  justifyContent="space-between"
                  alignItems={isMobile ? "flex-start" : "center"}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                      Order Details
                    </Typography>
                    <Stack spacing={0.75}>
                      <Typography variant="body2">
                        <strong>Order ID:</strong> {activeOrder.id}
                      </Typography>
                      {activeOrder.bookingId && (
                        <Typography variant="body2">
                          <strong>Booking ID:</strong> {activeOrder.bookingId}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        <strong>Driver:</strong> {activeOrder.driver}
                        {activeOrder.driverPhone && ` (${activeOrder.driverPhone})`}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Vehicle:</strong> {activeOrder.vehicle}
                        {activeOrder.vehicleSubtype && ` - ${activeOrder.vehicleSubtype}`}
                      </Typography>
                      {activeOrder.material && (
                        <Typography variant="body2">
                          <strong>Material:</strong> {activeOrder.material}
                          {activeOrder.quantity && ` (${activeOrder.quantity})`}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        <strong>From:</strong> {activeOrder.fromAddress}
                      </Typography>
                      <Typography variant="body2">
                        <strong>To:</strong> {activeOrder.toAddress}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status:</strong>{" "}
                        <span
                          style={{
                            color:
                              activeOrder.status === "completed"
                                ? "green"
                                : activeOrder.status === "confirmed"
                                ? "blue"
                                : "orange",
                            fontWeight: "bold",
                          }}
                        >
                          {activeOrder.status.toUpperCase()}
                        </span>
                      </Typography>
                      <Typography variant="body2">
                        <strong>Last Updated:</strong>{" "}
                        {activeOrder.lastUpdated
                          ? new Date(activeOrder.lastUpdated).toLocaleString()
                          : "N/A"}
                      </Typography>
                    </Stack>
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoCenter}
                        onChange={(e) => setAutoCenter(e.target.checked)}
                      />
                    }
                    label="Auto-Center Map"
                  />
                </Stack>
              </Paper>

              <Box
                sx={{
                  width: "100%",
                  height: { xs: "350px", sm: "450px", md: "550px" },
                  borderRadius: 2,
                  overflow: "hidden",
                  boxShadow: 3,
                }}
              >
                {activeOrder.location && (
                  <MapContainer
                    center={activeOrder.location}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                    whenCreated={(map) => {
                      if (autoCenter) {
                        map.flyTo(activeOrder.location, map.getZoom());
                      }
                    }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {currentOrders.map((order) => (
                      <Marker key={order.id} position={order.location}>
                        <Popup>
                          <strong>Order #{order.id}</strong>
                          <br />
                          {order.driver} – {order.vehicle}
                          <br />
                          {order.vehicleNumber && (
                            <>
                              Vehicle No: {order.vehicleNumber}
                              <br />
                            </>
                          )}
                          {order.lastUpdated
                            ? new Date(order.lastUpdated).toLocaleTimeString()
                            : ""}
                        </Popup>
                      </Marker>
                    ))}

                    {activeOrder.route && activeOrder.route.length > 1 && (
                      <Polyline positions={activeOrder.route} color="blue" />
                    )}
                  </MapContainer>
                )}
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default TrackingUpdates;
