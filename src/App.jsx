// App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import KYCPage from "./pages/KYCPage";

function App() {
  return (
    <Routes>
      {/* Default redirect to Sign In */}
      <Route path="/" element={<Home />} />

 `     {/* Auth Routes */}`
      <Route path="/signin" element={<Login />} />
      <Route path="/signup" element={<Login />} />
      <Route path="/kyc" element={<KYCPage />} />

      {/* Main App Routes */}
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
