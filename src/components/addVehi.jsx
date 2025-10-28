// src/components/VehicleList.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

const VehicleList = ({ companyName = "Blue Dart" }) => {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      const subtypesRef = collection(
        db,
        "Vehicles",
        "Trailer",
        "Companies",
        companyName,
        "subtypes"
      );

      try {
        const snapshot = await getDocs(subtypesRef);
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
  }, [companyName]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Vehicles for {companyName}</h2>
      {vehicles.length === 0 ? (
        <p>No vehicles found.</p>
      ) : (
        <ul>
          {vehicles.map(vehicle => (
            <li key={vehicle.id}>
              <strong>{vehicle.id}</strong> – {vehicle.vehicle_type}, {vehicle.capacity} units
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VehicleList;
