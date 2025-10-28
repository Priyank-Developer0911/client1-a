import {
  Box,
  Typography,
  Container,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Home() {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: "97vh",
          background: "linear-gradient(135deg, #1976d2 30%, #0d47a1 90%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <Typography
              variant="h2"
              fontWeight="bold"
              sx={{ fontSize: { xs: "2rem", md: "3.5rem" } }}
            >
              Welcome to LogitX
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <Typography
              variant="h6"
              sx={{ mt: 2, fontSize: { xs: "1rem", md: "1.25rem" } }}
            >
              Efficient Vehicle, Driver & Order Management with Real-Time Tracking
            </Typography>

            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={() => navigate("/signup")}
              sx={{
                mt: 4,
                px: 5,
                py: 1.5,
                fontSize: "1rem",
                borderRadius: "30px",
                boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.2)",
              }}
            >
              Get Started
            </Button>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
}

export default Home;
