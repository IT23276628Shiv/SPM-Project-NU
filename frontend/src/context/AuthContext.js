// context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import authfirebase from '../../services/firebaseAuth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.16.20.210:5000';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authfirebase, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const res = await fetch(`${API_URL}/users/${firebaseUser.uid}`);
          const data = await res.json();
          setUserDetails(data);
        } catch (err) {
          console.log("Error fetching user details:", err);
        }

      } else {
        setUser(null);
        setUserDetails(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(authfirebase);
      setUser(null);
      setUserDetails(null);
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, userDetails, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
