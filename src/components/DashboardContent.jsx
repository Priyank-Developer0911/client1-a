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
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
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
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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
        
        console.log("🏢 Company Name for Dashboard:", companyName);

        // Fetch all data in parallel for better performance
        const ordersQuery = companyName 
          ? query(collection(db, "AllOrders"), where("company_name", "==", companyName))
          : query(collection(db, "AllOrders"), where("userId", "==", user.uid));
          
        const driversQuery = companyName
          ? query(collection(db, "Drivers"), where("company_name", "==", companyName))
          : query(collection(db, "Drivers"), where("userId", "==", user.uid));

        const [ordersSnap, driversSnap] = await Promise.all([
          getDocs(ordersQuery),
          getDocs(driversQuery),
        ]);

        // Count active drivers (those with status 'active' or 'available')
        let activeDriverCount = 0;
        driversSnap.forEach((doc) => {
          const data = doc.data();
          const status = (data.status || "").toLowerCase();
          if (status === "active" || status === "available") {
            activeDriverCount++;
          }
        });

        // Process orders and revenue
        let totalRev = 0;
        let vehiclesUsedSet = new Set();
        const monthlyRev = {};

        console.log("📦 Processing", ordersSnap.size, "orders for revenue calculation");

        ordersSnap.forEach((doc) => {
          const data = doc.data();
          
          // Calculate revenue from multiple possible fields
          const amount =
            parseFloat(
              String(data.total_amount || data.price || data.amount || 0).replace(/[^\d.]/g, "")
            ) || 0;

          // Track unique vehicles in use
          if (data.vehicle_type) {
            vehiclesUsedSet.add(data.vehicle_type);
          }
          if (data.vehicle_number) {
            vehiclesUsedSet.add(data.vehicle_number);
          }

          // Only process orders with valid amounts for revenue calculation
          if (!isNaN(amount) && amount > 0) {
            totalRev += amount;

            // Handle different date formats safely for monthly grouping
            let date = null;
            try {
              // Try createdAt first
              if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                date = data.createdAt.toDate();
              } else if (data.createdAt && data.createdAt.seconds) {
                date = new Date(data.createdAt.seconds * 1000);
              } else if (data.createdAt) {
                date = new Date(data.createdAt);
              }
              
              // If createdAt is invalid, try booking_date
              if (!date || isNaN(date.getTime())) {
                if (data.booking_date) {
                  date = new Date(data.booking_date);
                }
              }
              
              // If still no valid date, try other date fields
              if (!date || isNaN(date.getTime())) {
                if (data.date) {
                  date = new Date(data.date);
                } else if (data.order_date) {
                  date = new Date(data.order_date);
                } else {
                  // Use current date as last resort
                  date = new Date();
                }
              }

              // Validate date and add to monthly revenue
              if (date instanceof Date && !isNaN(date.getTime())) {
                // Create consistent month-year key for grouping
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const displayLabel = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
                
                if (!monthlyRev[monthYear]) {
                  monthlyRev[monthYear] = {
                    label: displayLabel,
                    value: 0,
                    date: new Date(date.getFullYear(), date.getMonth(), 1), // First day of month for sorting
                    count: 0
                  };
                }
                monthlyRev[monthYear].value += amount;
                monthlyRev[monthYear].count += 1;
                
                console.log(`✅ Order ${doc.id}: ₹${amount} added to ${displayLabel}`);
              } else {
                console.warn(`⚠️ Order ${doc.id}: Invalid date - Amount ₹${amount} not added to chart`);
              }
            } catch (error) {
              console.error('❌ Error parsing date for order:', doc.id, error);
            }
          } else if (amount === 0) {
            console.log(`ℹ️ Order ${doc.id}: Zero amount, skipped`);
          }
        });

        // Update state
        setTotalOrders(ordersSnap.size);
        setActiveDrivers(activeDriverCount);
        setVehiclesInUse(vehiclesUsedSet.size);
        setTotalRevenue(totalRev);

        // Create complete 12-month view for current year
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-11
        
        // Generate all 12 months for the year
        const allMonthsOfYear = [];
        for (let i = 0; i < 12; i++) {
          const monthDate = new Date(currentYear, i, 1);
          const monthYear = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
          const displayLabel = monthDate.toLocaleString("default", { month: "short" });
          
          // Check if we have data for this month
          const monthData = monthlyRev[monthYear];
          
          allMonthsOfYear.push({
            label: displayLabel,
            value: monthData ? monthData.value : 0,
            count: monthData ? monthData.count : 0,
            hasData: !!monthData
          });
          
          // Stop at current month (don't show future months)
          if (i === currentMonth) break;
        }
        
        setMonthlyRevenue(allMonthsOfYear);
        
        console.log("📊 Dashboard Stats:", {
          totalOrders: ordersSnap.size,
          activeDrivers: activeDriverCount,
          vehicles: vehiclesUsedSet.size,
          totalRevenue: totalRev,
          year: currentYear,
          monthsDisplayed: allMonthsOfYear.length,
          monthlyBreakdown: allMonthsOfYear
            .filter(m => m.hasData)
            .map(m => `${m.label}: ₹${m.value.toLocaleString()} (${m.count} orders)`)
        });
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Chart data from monthlyRevenue state - Line Chart Configuration
  const revenueData = {
    labels: monthlyRevenue.map((m) => m.label),
    datasets: [
      {
        label: "Monthly Revenue",
        data: monthlyRevenue.map((m) => m.value),
        fill: true,
        backgroundColor: "rgba(25, 118, 210, 0.08)",
        borderColor: "rgba(25, 118, 210, 1)",
        borderWidth: 2.5,
        tension: 0.4, // Smooth curve like the reference
        pointRadius: (context) => {
          // Larger points for months with data
          const index = context.dataIndex;
          return monthlyRevenue[index]?.hasData ? 5 : 4;
        },
        pointHoverRadius: 8,
        pointBackgroundColor: (context) => {
          // Highlight current month or months with data
          const index = context.dataIndex;
          const hasData = monthlyRevenue[index]?.hasData;
          return hasData ? "rgba(25, 118, 210, 1)" : "rgba(150, 150, 150, 0.5)";
        },
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverBackgroundColor: "rgba(0, 188, 212, 1)", // Cyan highlight on hover
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 3,
        spanGaps: true, // Connect points even with zero values
      },
    ],
  };

  const revenueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { 
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 13,
            weight: 500
          }
        }
      },
      title: {
        display: true,
        text: "Monthly Revenue Trend",
        font: { size: 18, weight: 600 },
        color: "#333",
        padding: { bottom: 20 }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            const monthData = monthlyRevenue[index];
            return `${context[0].label} 2025`;
          },
          label: function(context) {
            const value = context.parsed.y;
            const index = context.dataIndex;
            const monthData = monthlyRevenue[index];
            
            if (value === 0) {
              return 'No revenue this month';
            }
            
            const formattedRevenue = `Revenue: ₹${new Intl.NumberFormat("en-IN").format(value)}`;
            const orderCount = monthData.count ? ` (${monthData.count} orders)` : '';
            return formattedRevenue + orderCount;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          callback: (value) => {
            if (value >= 100000) {
              return `₹${(value / 100000).toFixed(1)}L`;
            } else if (value >= 1000) {
              return `₹${(value / 1000).toFixed(0)}K`;
            }
            return `₹${value}`;
          },
          font: {
            size: 11,
            family: "'Roboto', 'Helvetica', 'Arial', sans-serif"
          },
          padding: 8,
          color: '#666'
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.03)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
            family: "'Roboto', 'Helvetica', 'Arial', sans-serif",
            weight: 500
          },
          maxRotation: 0,
          minRotation: 0,
          color: '#666',
          padding: 8
        },
        border: {
          display: false
        }
      }
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
        sx={{ 
          fontSize: { xs: 24, sm: 32, md: 36 },
          fontWeight: 600,
          mb: 2 
        }}
      >
        Dashboard Overview
      </Typography>
      <hr style={{ marginBottom: "24px", border: "none", borderTop: "2px solid #e0e0e0" }} />

      {/* Summary Cards */}
      <Grid
        container
        spacing={{ xs: 2, sm: 2.5, md: 3 }}
        sx={{
          mb: { xs: 3, sm: 4 },
          mt: { xs: 1, sm: 2 },
        }}
      >
        {cardData.map((card, idx) => (
          <Grid key={idx} item xs={12} sm={6} md={3}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 2.5, sm: 3 },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                borderRadius: 2,
                transition: "all 0.3s ease",
                height: "100%",
                "&:hover": {
                  boxShadow: 6,
                  transform: "translateY(-4px)",
                },
              }}
            >
              <Box sx={{ 
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 60,
                height: 60,
                borderRadius: "50%",
                bgcolor: "rgba(25, 118, 210, 0.1)"
              }}>
                {card.icon}
              </Box>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mt: 1,
                  mb: 1.5,
                  fontSize: { xs: 13, sm: 14 },
                  color: "text.secondary",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}
              >
                {card.title}
              </Typography>
              <Typography 
                variant="h4" 
                fontWeight={700}
                sx={{
                  fontSize: { xs: 24, sm: 28, md: 32 },
                  color: "primary.main"
                }}
              >
                {card.title === "Total Revenue" ? (
                  `₹${new Intl.NumberFormat("en-IN").format(card.value)}`
                ) : (
                  <CountUp
                    start={0}
                    end={card.value}
                    duration={2}
                    prefix={card.prefix || ""}
                    separator=","
                  />
                )}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Revenue Chart */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          minHeight: { xs: 350, sm: 400, md: 450 },
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ 
            fontSize: { xs: 18, sm: 20, md: 24 },
            fontWeight: 600,
            mb: 2 
          }}
        >
          Revenue Statistics
        </Typography>
        {monthlyRevenue.length > 0 ? (
          <Box sx={{ height: { xs: 300, sm: 350, md: 400 } }}>
            <Line data={revenueData} options={revenueOptions} />
          </Box>
        ) : (
          <Box 
            sx={{ 
              height: { xs: 300, sm: 350, md: 400 },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 2
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No revenue data available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revenue will appear here once orders are created
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DashboardContent;
