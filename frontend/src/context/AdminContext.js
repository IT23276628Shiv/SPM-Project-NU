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
      console.log('Firebase auth state changed:', firebaseUser?.email);
      
      if (firebaseUser) {
        try {
          // Get Firebase ID token
          const token = await firebaseUser.getIdToken();
          console.log('Got Firebase token for admin check');
          
          // Try to authenticate as admin
          const res = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firebaseUid: firebaseUser.uid }),
          });

          const data = await res.json();
          console.log('Admin login response:', { status: res.status, data });
          
          if (res.ok && data.admin) {
            console.log('✅ Admin authenticated successfully');
            setAdmin(firebaseUser);
            setAdminDetails(data.admin);
          } else {
            console.log('❌ Not an admin user:', data.error);
            setAdmin(null);
            setAdminDetails(null);
          }
        } catch (err) {
          console.error("Admin authentication error:", err);
          setAdmin(null);
          setAdminDetails(null);
        }
      } else {
        console.log('No Firebase user');
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