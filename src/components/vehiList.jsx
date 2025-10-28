// src/components/VehicleList.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Adjust the import path as necessary
import { useAuth } from "../contexts/AuthContext";

const VehicleList = ({ companyName = "Blue Dart" }) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!user) return;
      
      const vehiclesRef = collection(db, "Vehicles");
      const vehiclesQuery = query(vehiclesRef, where("userId", "==", user.uid));

      try {
        const snapshot = await getDocs(vehiclesQuery);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(data);
      } catch (err) {
        console.error("Error fetching vehicles:", err);
      }
    };

    fetchVehicles();
  }, [user]);

  if (!user) {
    return (
      <div style={{ padding: "20px" }}>
        <p>Please log in to view vehicles</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Your Vehicles</h2>
      {vehicles.length === 0 ? (
        <p>No vehicles found.</p>
      ) : (
        <ul>
          {vehicles.map(vehicle => (
            <li key={vehicle.id}>
              <strong>{vehicle.company_name || vehicle.id}</strong> – {vehicle.vehicle_type}, {vehicle.capacity} units
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VehicleList;
