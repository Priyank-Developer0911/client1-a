import React, { useEffect, useState } from "react";
import {
  Typography,
  Grid,
  Paper,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import CountUp from "react-countup";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { db, auth } from "../firebaseConfig"; // Adjust the import path as necessary
import { collection, getDocs, query, where } from "firebase/firestore";
import { IndianRupee } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DashboardContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State for dynamic data
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [vehiclesInUse, setVehiclesInUse] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [kycPending, setKycPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Check for authenticated user
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel for better performance
        const [ordersSnap, driversSnap, vehiclesSnap] = await Promise.all([
          getDocs(
            query(collection(db, "AllOrders"), where("userId", "==", user.uid))
          ),
          getDocs(
            query(
              collection(db, "Drivers"),
              where("userId", "==", user.uid),
              where("status", "==", "active")
            )
          ),
          getDocs(
            query(
              collection(db, "Vehicles"),
              where("userId", "==", user.uid)
            )
          ),
        ]);

        // Process orders and revenue
        let totalRev = 0;
        const monthlyRev = {};

        ordersSnap.forEach((doc) => {
          const data = doc.data();
          const amount =
            parseFloat(
              data.price?.toString().replace(/[^\d.]/g, "") ||
                data.total_amount ||
                0
            ) || 0;

          if (!isNaN(amount)) {
            totalRev += amount;

            // Handle different date formats safely
            let date;
            try {
              if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                // Firestore Timestamp
                date = data.createdAt.toDate();
              } else if (data.createdAt && data.createdAt.seconds) {
                // Firestore Timestamp as object
                date = new Date(data.createdAt.seconds * 1000);
              } else if (data.createdAt) {
                // Regular Date object or string
                date = new Date(data.createdAt);
              } else if (data.booking_date) {
                // Fallback to booking_date
                date = new Date(data.booking_date);
              } else {
                // Use current date as fallback
                date = new Date();
              }
            } catch (error) {
              console.warn('Error parsing date:', error, 'Using current date');
              date = new Date();
            }

            if (date instanceof Date && !isNaN(date.getTime())) {
              const key = `${date.toLocaleString("default", {
                month: "short",
              })} ${date.getFullYear()}`;
              monthlyRev[key] = (monthlyRev[key] || 0) + amount;
            }
          }
        });

        // Update state
        setTotalOrders(ordersSnap.size);
        setActiveDrivers(driversSnap.size);
        setVehiclesInUse(vehiclesSnap.size);
        setTotalRevenue(totalRev);

        // Process monthly revenue
        const sortedMonths = Object.entries(monthlyRev)
          .sort((a, b) => new Date(a[0]) - new Date(b[0]))
          .slice(-6)
          .map(([label, value]) => ({ label, value }));

        setMonthlyRevenue(sortedMonths);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Chart data from monthlyRevenue state
  const revenueData = {
    labels: monthlyRevenue.map((m) => m.label),
    datasets: [
      {
        label: "Revenue (₹)",
        data: monthlyRevenue.map((m) => m.value),
        backgroundColor: "rgba(25, 118, 210, 0.7)",
        borderRadius: 6,
        hoverBackgroundColor: "rgba(25, 118, 210, 1)",
      },
    ],
  };

  const revenueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Monthly Revenue",
        font: { size: 18 },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `₹${value / 1000}K`,
        },
        beginAtZero: true,
      },
    },
  };

  const cardData = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: <ShoppingCartIcon color="primary" sx={{ fontSize: 40 }} />,
    },
    {
      title: "Active Drivers",
      value: activeDrivers,
      icon: <LocalShippingIcon color="primary" sx={{ fontSize: 40 }} />,
    },
    {
      title: "Vehicles In Use",
      value: vehiclesInUse,
      icon: <DirectionsCarIcon color="primary" sx={{ fontSize: 40 }} />,
    },
    {
      title: "Total Revenue",
      value: totalRevenue,
      prefix: "₹",
      icon: (
        <CurrencyRupeeIcon size={40} color="primary" sx={{ fontSize: 40 }} />
      ),
    },
  ];

  if (authLoading || loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Loading dashboard data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view dashboard</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontSize: { xs: 24, md: 40 } }}
      >
        Dashboard Overview
      </Typography>
      <hr />

      {/* Summary Cards */}
      <Grid
        container
        spacing={isMobile ? 7 : 4}
        justifyContent={isMobile ? "center" : "flex-start"}
        sx={{
          mb: { xs: 2, sm: 3, md: 4 },
          mt: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {cardData.map((card, idx) => (
          <Grid key={idx} item xs={12} sm={6} md={3}>
            <Box display="flex" justifyContent="center">
              <Paper
                elevation={4}
                sx={{
                  width: "100%",
                  maxWidth: 280,
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  transition: "0.3s",
                  "&:hover": {
                    boxShadow: 6,
                    transform: "scale(1.03)",
                  },
                }}
              >
                {card.icon}
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  {card.title}
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {card.title === "Total Revenue" ? (
                    `₹ ${new Intl.NumberFormat("en-IN").format(card.value)}`
                  ) : (
                    <CountUp
                      start={0}
                      end={card.value}
                      duration={1.5}
                      prefix={card.prefix || ""}
                      separator=","
                    />
                  )}
                </Typography>
              </Paper>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Revenue Chart */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          overflowX: "auto",
          height: { xs: 300, md: 400 },
          mt: 4,
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ fontSize: { xs: 18, md: 30 } }}
        >
          Revenue Statistics
        </Typography>
        <Box sx={{ minWidth: 420, height: "100%" }}>
          <Bar data={revenueData} options={revenueOptions} />
        </Box>
      </Paper>
    </Box>
  );
};

export default DashboardContent;
