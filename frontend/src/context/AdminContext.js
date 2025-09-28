// frontend/src/context/AdminContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import authfirebase from '../../services/firebaseAuth';
import { API_URL } from "../constants/config";

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminDetails, setAdminDetails] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authfirebase, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Try to authenticate as admin
          const token = await firebaseUser.getIdToken();
          const res = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firebaseUid: firebaseUser.uid }),
          });

          const data = await res.json();
          
          if (res.ok) {
            setAdmin(firebaseUser);
            setAdminDetails(data.admin);
          } else {
            setAdmin(null);
            setAdminDetails(null);
          }
        } catch (err) {
          console.log("Admin authentication error:", err);
          setAdmin(null);
          setAdminDetails(null);
        }
      } else {
        setAdmin(null);
        setAdminDetails(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(authfirebase);
      setAdmin(null);
      setAdminDetails(null);
    } catch (err) {
      console.log("Admin logout error:", err);
    }
  };

  return (
    <AdminContext.Provider value={{ admin, loading, adminDetails, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);

