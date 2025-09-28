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
      console.log('🔍 Firebase auth state changed:');
      console.log('- Email:', firebaseUser?.email);
      console.log('- UID:', firebaseUser?.uid);
      
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const token = await firebaseUser.getIdToken();
          console.log('🎫 Got Firebase token, fetching user details...');

          const res = await fetch(`${API_URL}/api/auth/user/${firebaseUser.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          console.log('🌐 API Request:', res.status, res.ok);
          const data = await res.json();
          console.log('📦 Raw API Response:', data);

          if (res.ok && data.user) {
            const mappedUser = {
              _id: data.user._id,
              username: data.user.username,
              email: data.user.email,
              role: data.user.role || null,   // ✅ force include role
              favoriteProducts: data.user.favoriteProducts || [],
              infoCompleted: data.user.infoCompleted,
              registrationDate: data.user.registrationDate,
              ratingAverage: data.user.ratingAverage,
              profilePictureUrl: data.user.profilePictureUrl,
              address: data.user.address,
              bio: data.user.bio,
            };

            setUserDetails(mappedUser);
            console.log('🎯 Setting userDetails to:', mappedUser);
          } else {
            console.log('❌ User not found or API error:', data.error);
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

  useEffect(() => {
    console.log('🔄 AuthContext State Update:');
    console.log('- User exists:', !!user);
    console.log('- Loading:', loading);
    console.log('- UserDetails exists:', !!userDetails);
    console.log('- UserDetails.role:', userDetails?.role);
    console.log('- IsAdmin computed:', userDetails?.role === 'admin' || userDetails?.role === 'super_admin');
  }, [user, loading, userDetails]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userDetails, 
      logout,
      isAdmin: userDetails?.role === 'admin' || userDetails?.role === 'super_admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
