// import React, { useState } from "react";
// import axios from "axios";
// import {
//   Grid,
//   Paper,
//   Avatar,
//   TextField,
//   Button,
//   Typography,
//   Link,
//   IconButton,
//   InputAdornment,
//   Snackbar,
// } from "@mui/material";
// import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
// import Visibility from "@mui/icons-material/Visibility";
// import VisibilityOff from "@mui/icons-material/VisibilityOff";
// import MuiAlert from "@mui/material/Alert";
// import { useNavigate } from "react-router-dom";

// // Firebase imports
// import { auth, db } from "../firebaseConfig";
// import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
// import { setDoc, doc } from "firebase/firestore";

// const Alert = React.forwardRef(function Alert(props, ref) {
//   return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
// });

// const SignUp = () => {
//   const [firstName, setFirstName] = useState("");
//   const [lastName, setLastName] = useState("");
//   const [mobileNumber, setMobileNumber] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPass, setConfirmPass] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [emailError, setEmailError] = useState("");
//   const [passError, setPassError] = useState("");
//   const [matchError, setMatchError] = useState("");
//   const [snackbar, setSnackbar] = useState({
//     open: false,
//     message: "",
//     severity: "success",
//   });

//   const navigate = useNavigate();

//   const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
//   const validatePassword = (password) => {
//     const lengthValid = password.length >= 6;
//     const hasLetter = /[a-zA-Z]/.test(password);
//     const hasNumber = /[0-9]/.test(password);
//     return lengthValid && hasLetter && hasNumber;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     let isValid = true;

//     // Email
//     if (!validateEmail(email)) {
//       setEmailError("Enter a valid email address");
//       isValid = false;
//     } else {
//       setEmailError("");
//     }

//     // Password
//     if (!validatePassword(password)) {
//       setPassError("Password must be 6+ chars with letters & numbers");
//       isValid = false;
//     } else {
//       setPassError("");
//     }

//     // Confirm Password
//     if (password !== confirmPass) {
//       setMatchError("Passwords do not match");
//       isValid = false;
//     } else {
//       setMatchError("");
//     }

//     if (!isValid) return;

//     try {
//       const userCredential = await createUserWithEmailAndPassword(
//         auth,
//         email,
//         password
//       );

//       await updateProfile(userCredential.user, {
//         displayName: `${firstName} ${lastName}`,
//       });

//       // Add +91 prefix and sanitize mobile number
//       const formattedMobileNumber = "+91" + mobileNumber.replace(/\D/g, "");

//       // SAVE TO FIRESTORE with mobile number as document ID
//       await setDoc(doc(db, "users", formattedMobileNumber), {
//         firstName,
//         lastName,
//         email,
//         mobileNumber: formattedMobileNumber,
//       });

//       setSnackbar({
//         open: true,
//         message: "Registered successfully!",
//         severity: "success",
//       });

//       setTimeout(() => navigate("/signin"), 200);
//     } catch (err) {
//       console.error(err);

//       setSnackbar({
//         open: true,
//         message: "Registration failed. Try a different email.",
//         severity: "error",
//       });
//     }
//     // Clear form fields
//     setFirstName("");
//     setLastName("");
//     setMobileNumber("");
//     setEmail("");
//     setPassword("");
//     setConfirmPass("");
//   };

//   return (
//     <Grid
//       container
//       style={{
//         minHeight: "100vh",
//         justifyContent: "center",
//         alignItems: "center",
//       }}
//     >
//       <Paper
//         elevation={10}
//         style={{ padding: 30, width: 380, borderRadius: 12 }}
//       >
//         <Grid align="center">
//           <Avatar sx={{ bgcolor: "#4caf50" }}>
//             <PersonAddAltIcon />
//           </Avatar>
//           <Typography variant="h5" mt={2} mb={1} fontWeight="bold">
//             Sign Up
//           </Typography>
//         </Grid>
//         <form onSubmit={handleSubmit} noValidate>
//           <TextField
//             label="First Name"
//             fullWidth
//             required
//             value={firstName}
//             onChange={(e) => setFirstName(e.target.value)}
//             sx={{ my: 1 }}
//           />
//           <TextField
//             label="Last Name"
//             fullWidth
//             required
//             value={lastName}
//             onChange={(e) => setLastName(e.target.value)}
//             sx={{ my: 1 }}
//           />
//           <TextField
//             label="Mobile Number"
//             fullWidth
//             required
//             value={mobileNumber}
//             onChange={(e) => setMobileNumber(e.target.value)}
//             InputProps={{
//               startAdornment: (
//                 <InputAdornment position="start">+91</InputAdornment>
//               ),
//             }}
//             sx={{ my: 1 }}
//           />
//           <TextField
//             label="Email"
//             autoComplete="off"
//             fullWidth
//             required
//             value={email}
//             error={!!emailError}
//             helperText={emailError}
//             onChange={(e) => setEmail(e.target.value)}
//             sx={{ my: 1 }}
//           />
//           <TextField
//             label="Password"
//             autoComplete="new-password"
//             type={showPassword ? "text" : "password"}
//             fullWidth
//             required
//             value={password}
//             error={!!passError}
//             helperText={passError}
//             onChange={(e) => setPassword(e.target.value)}
//             sx={{ my: 1 }}
//             InputProps={{
//               endAdornment: (
//                 <InputAdornment position="end">
//                   <IconButton onClick={() => setShowPassword((prev) => !prev)}>
//                     {showPassword ? <VisibilityOff /> : <Visibility />}
//                   </IconButton>
//                 </InputAdornment>
//               ),
//             }}
//           />
//           <TextField
//             label="Confirm Password"
//             type={showPassword ? "text" : "password"}
//             fullWidth
//             required
//             value={confirmPass}
//             error={!!matchError}
//             helperText={matchError}
//             onChange={(e) => setConfirmPass(e.target.value)}
//             sx={{ my: 1 }}
//           />
//           <Button
//             type="submit"
//             fullWidth
//             variant="contained"
//             color="success"
//             sx={{ mt: 2, fontWeight: "bold" }}
//           >
//             Register
//           </Button>
//         </form>
//         <Typography align="center" mt={2}>
//           Already have an account?{" "}
//           <Link component="button" onClick={() => navigate("/signin")}>
//             Sign In
//           </Link>
//         </Typography>
//       </Paper>
//       <Snackbar
//         open={snackbar.open}
//         autoHideDuration={3000}
//         onClose={() => setSnackbar({ ...snackbar, open: false })}
//       >
//         <Alert
//           onClose={() => setSnackbar({ ...snackbar, open: false })}
//           severity={snackbar.severity}
//           sx={{ width: "100%" }}
//         >
//           {snackbar.message}
//         </Alert>
//       </Snackbar>
//     </Grid>
//   );
// };

// export default SignUp;
import React, { useState } from "react";
import {
  Grid,
  Paper,
  Avatar,
  TextField,
  Button,
  Typography,
  Link,
  IconButton,
  InputAdornment,
  Snackbar,
} from "@mui/material";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import MuiAlert from "@mui/material/Alert";
import { useNavigate } from "react-router-dom";

// ========================================
// CLIENT CODE (Old Imports)
// ========================================
// Firebase imports
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

// ========================================
// CHANGES BY DEVELOPER (New Imports - Added Axios)
// ========================================
import axios from "axios";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const SignUp = () => {
  // Fields for Primary Contact Person
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Other mandatory fields
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passError, setPassError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const navigate = useNavigate();

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const validatePassword = (password) => {
    const lengthValid = password.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return lengthValid && hasLetter && hasNumber;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let isValid = true;

    // Validate all mandatory fields
    if (
      !companyName ||
      !businessAddress ||
      !firstName ||
      !lastName ||
      !mobileNumber ||
      !email
    ) {
      setSnackbar({
        open: true,
        message: "Please fill all mandatory fields.",
        severity: "error",
      });
      return;
    }

    // Email validation
    if (!validateEmail(email)) {
      setEmailError("Enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Password validation
    if (!validatePassword(password)) {
      setPassError("Password must be 6+ chars with letters & numbers");
      isValid = false;
    } else {
      setPassError("");
    }

    // Confirm Password validation
    if (password !== confirmPass) {
      setMatchError("Passwords do not match");
      isValid = false;
    } else {
      setMatchError("");
    }

    if (!isValid) return;

    try {
      // ========================================
      // CLIENT CODE (Old Implementation)
      // ========================================
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 2. Update the user's profile in Firebase Auth
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      const formattedMobileNumber = "+91" + mobileNumber.replace(/\D/g, "");

      // ========================================
      // CHANGES BY DEVELOPER (Updated Firestore Structure)
      // Matching exact structure from reference image
      // ========================================
      
      // 3. Save data to Firestore - companies collection (matching reference structure)
      await setDoc(doc(db, "companies", companyName), {
        // Basic company info
        company_name: companyName,
        businessAddress: businessAddress,
        
        // Primary contact (nested object matching reference)
        primaryContact: {
          firstName: firstName,
          lastName: lastName,
          email: email,
          mobileNumber: formattedMobileNumber
        },
        
        // User reference
        userId: user.uid,
        
        // KYC related fields (matching reference image exactly)
        kycStatus: "not-submitted",
        documentUploadMethod: null,
        kycSubmittedAt: null,
        
        // Documents object structure matching reference
        documents: {
          bankDetails: null,
          gstCertificate: null,
          incorporationCertificate: null,
          panCard: null,
          signatoryId: null
        },
        
        // Service flags (matching reference structure)
        realtimeTracking: false,
        multimodalServices: false,
        multitemperatureService: false,
        partialLoadingAndUnloading: false,
        
        // Additional fields from reference
        company_logo: null,
        description: "",
        
        // Timestamps
        createdAt: serverTimestamp(),
      });

      // ========================================
      // CHANGES BY DEVELOPER (NEW - MongoDB Backend Integration)
      // ========================================
      
      // 4. Also save to MongoDB backend
      try {
        await axios.post('http://localhost:5000/api/auth/signup', {
          email: email,
          password: password,
          companyName: companyName,
          phoneNumber: formattedMobileNumber,
          address: businessAddress,
          firstName: firstName,
          lastName: lastName,
          firebaseUid: user.uid, // Link to Firebase UID
          kycStatus: "not-submitted"
        });
        console.log('✅ User data saved to MongoDB successfully');
      } catch (backendError) {
        console.warn('⚠️ MongoDB save failed, but Firebase registration successful:', backendError.message);
        // Don't fail the registration if MongoDB save fails
      }

      setSnackbar({
        open: true,
        message: "Registered successfully! Please sign in.",
        severity: "success",
      });

      // Navigate to sign-in page after a short delay
      setTimeout(() => navigate("/signin"), 2000);
    } catch (err) {
      console.error("Registration Error:", err);
      const message =
        err.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : "Registration failed. Please try again.";
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    }
  };

  return (
    <Grid container style={{ minHeight: "100vh", justifyContent: "center", alignItems: "center" }}>
      <Paper elevation={10} style={{ padding: 30, width: 400, borderRadius: 12 }}>
        <Grid align="center">
          <Avatar sx={{ bgcolor: "#4caf50" }}>
            <PersonAddAltIcon />
          </Avatar>
          <Typography variant="h5" mt={2} mb={1} fontWeight="bold">
            Create Corporate Account
          </Typography>
        </Grid>
        <form onSubmit={handleSubmit} noValidate>
          {/* Corporate fields */}
          <TextField label="Company Name" fullWidth required value={companyName} onChange={(e) => setCompanyName(e.target.value)} sx={{ my: 1 }} />
          <TextField label="Registered Business Address" fullWidth required value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} sx={{ my: 1 }} />

          {/* Primary Contact Person fields */}
          <TextField label="Primary Contact First Name" fullWidth required value={firstName} onChange={(e) => setFirstName(e.target.value)} sx={{ my: 1 }} />
          <TextField label="Primary Contact Last Name" fullWidth required value={lastName} onChange={(e) => setLastName(e.target.value)} sx={{ my: 1 }} />
          <TextField
            label="Mobile Number"
            fullWidth
            required
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
            sx={{ my: 1 }}
          />
          <TextField label="Contact Email" autoComplete="off" fullWidth required value={email} error={!!emailError} helperText={emailError} onChange={(e) => setEmail(e.target.value)} sx={{ my: 1 }} />

          {/* Password fields */}
          <TextField
            label="Password"
            autoComplete="new-password"
            type={showPassword ? "text" : "password"}
            fullWidth
            required
            value={password}
            error={!!passError}
            helperText={passError}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ my: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((prev) => !prev)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            required
            value={confirmPass}
            error={!!matchError}
            helperText={matchError}
            onChange={(e) => setConfirmPass(e.target.value)}
            sx={{ my: 1 }}
          />

          <Button type="submit" fullWidth variant="contained" color="success" sx={{ mt: 2, fontWeight: "bold" }}>
            Register
          </Button>
        </form>
        <Typography align="center" mt={2}>
          Already have an account?{" "}
          <Link component="button" onClick={() => navigate("/signin")}>
            Sign In
          </Link>
        </Typography>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default SignUp;