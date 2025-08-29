// AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import authfirebase from '../../services/firebaseAuth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // optional: for splash/loading screen

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authfirebase, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        console.log("Logged in user:", firebaseUser);
      } else {
        setUser(null);
        console.log("Logged out");
      }
      setLoading(false);
    });

    return () => unsubscribe(); // cleanup
  }, []);

  // Optional: signOut function
  const logout = async () => {
    try {
      await signOut(authfirebase);
      setUser(null);
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

























// import React, { createContext, useState, useContext } from 'react';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// // import axios from 'axios';
// // import { API_URL } from '../constants/config';

// // const AuthContext = createContext();

// // export const AuthProvider = ({ children }) => {
// //   const [user, setUser] = useState(null);

// //   const signIn = async ({ email, password }) => {
// //     const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
// //     const { token, user } = response.data;
// //     await AsyncStorage.setItem('token', token);
// //     setUser(user);
// //   };

// //   const signOut = async () => {
// //     await AsyncStorage.removeItem('token');
// //     setUser(null);
// //   };

// //   return (
// //     <AuthContext.Provider value={{ user, signIn, signOut }}>
// //       {children}
// //     </AuthContext.Provider>
// //   );
// // };

// // export const useAuth = () => useContext(AuthContext);