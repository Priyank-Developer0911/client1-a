import React, { useState } from "react";
import {
  Typography,
  Paper,
  TextField,
  Button,
  Snackbar,
  Alert,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Box,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Card,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import emailjs from "@emailjs/browser";

const SupportCommunication = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "",
    otherCategory: "",
    file: null,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Valid email required";
    if (!formData.subject) newErrors.subject = "Subject is required";
    if (!formData.message) newErrors.message = "Message is required";
    if (!formData.category) newErrors.category = "Select a category";
    if (formData.category === "Other" && !formData.otherCategory)
      newErrors.otherCategory = "Please specify other category";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    // Prepare template params for EmailJS
    const templateParams = {
      name: formData.name,
      email: formData.email,
      subject: formData.subject,
      message: formData.message,
      category:
        formData.category === "Other"
          ? formData.otherCategory
          : formData.category,
    };

    try {
      await emailjs.send(
        "service_8v3xg7t", // Replace with your EmailJS service ID
        "template_8v3xg7t", // Replace with your EmailJS template ID
        templateParams,
        "user_8v3xg7t" // Replace with your EmailJS public key
      );
      setSnackbar({
        open: true,
        message: "Your message has been sent to LogitX admin.",
        type: "success",
      });
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        category: "",
        otherCategory: "",
        file: null,
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error sending message.",
        type: "error",
      });
    }
    setLoading(false);
  };

  const handleSnackbarClose = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontSize: { xs: 22, md: 40 }, fontWeight: 700, color: "#1976d2" }}
      >
        Support & Communication
      </Typography>
      <hr />

      <Box display="flex" justifyContent="center" mt={4}>
        <Card
          elevation={6}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            width: "100%",
            maxWidth: 600,
            borderRadius: 4,
            background: "linear-gradient(135deg,#e3f2fd 0%,#fff 100%)",
            boxShadow: "0 8px 32px rgba(25,118,210,0.08)",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            align="center"
            sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, fontWeight: 600 }}
          >
            Contact LogitX Admin for Any Issues
          </Typography>

          <Stack spacing={2} mt={2}>
            <TextField
              label="Your Name"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              error={!!errors.name}
              helperText={errors.name}
            />

            <TextField
              label="Your Email"
              fullWidth
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={!!errors.email}
              helperText={errors.email}
            />

            <TextField
              label="Subject"
              fullWidth
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              error={!!errors.subject}
              helperText={errors.subject}
            />

            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Issue Category</InputLabel>
              <Select
                value={formData.category}
                label="Issue Category"
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                <MenuItem value="Driver">Driver</MenuItem>
                <MenuItem value="Vehicle">Vehicle</MenuItem>
                <MenuItem value="Payment">Payment</MenuItem>
                <MenuItem value="Order">Order</MenuItem>
                <MenuItem value="Tracking">Tracking</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
              {errors.category && (
                <Typography color="error" variant="caption">
                  {errors.category}
                </Typography>
              )}
            </FormControl>

            {formData.category === "Other" && (
              <TextField
                label="Specify Other Category"
                fullWidth
                value={formData.otherCategory}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    otherCategory: e.target.value,
                  })
                }
                error={!!errors.otherCategory}
                helperText={errors.otherCategory}
              />
            )}

            <TextField
              label="Message"
              multiline
              rows={4}
              fullWidth
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              error={!!errors.message}
              helperText={errors.message}
            />

            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              fullWidth
              sx={{ borderStyle: "dashed" }}
            >
              Upload File
              <input
                type="file"
                hidden
                onChange={(e) =>
                  setFormData({ ...formData, file: e.target.files[0] })
                }
              />
            </Button>

            {formData.file && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ wordBreak: "break-all" }}
              >
                Selected File: <strong>{formData.file.name}</strong>
              </Typography>
            )}

            <Box position="relative">
              <Button
                variant="contained"
                size="large"
                fullWidth
                color="primary"
                onClick={handleSubmit}
                sx={{
                  fontWeight: "bold",
                  textTransform: "none",
                  fontSize: 18,
                  py: 1.5,
                  borderRadius: 2,
                }}
                disabled={loading}
              >
                Submit Request
              </Button>
              {loading && (
                <CircularProgress
                  size={32}
                  sx={{
                    color: "#1976d2",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    marginTop: "-16px",
                    marginLeft: "-16px",
                  }}
                />
              )}
            </Box>
          </Stack>
        </Card>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.type}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupportCommunication;
