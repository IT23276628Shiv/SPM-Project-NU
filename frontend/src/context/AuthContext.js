import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import authfirebase from '../../services/firebaseAuth';
import { API_URL } from "../constants/config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authfirebase, async (firebaseUser) => {
      console.log('🔍 Firebase auth state changed:', firebaseUser?.email);
      
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          // Get Firebase ID token
          const token = await firebaseUser.getIdToken();
          console.log('🎫 Getting user details from backend...');

          const res = await fetch(`${API_URL}/api/auth/user/${firebaseUser.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await res.json();
          console.log('👤 User details response:', {
            status: res.status,
            role: data.user?.role,
            email: data.user?.email
          });

          if (res.ok && data.user) {
            setUserDetails(data.user);
            
            // Log role for debugging
            if (data.user.role === 'admin' || data.user.role === 'super_admin') {
              console.log('✅ Admin user detected:', data.user.role);
            } else {
              console.log('👤 Regular user:', data.user.role);
            }
          } else {
            console.log('❌ Failed to get user details:', data.error);
            setUserDetails(null);
          }
        } catch (err) {
          console.error("💥 Error fetching user details:", err);
          setUserDetails(null);
        }
      } else {
        console.log('🚪 User logged out');
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
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userDetails, 
      logout,
      // Helper function to check if user is admin
      isAdmin: userDetails?.role === 'admin' || userDetails?.role === 'super_admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
