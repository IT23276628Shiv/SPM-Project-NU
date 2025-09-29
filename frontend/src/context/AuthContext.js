// frontend/src/context/AuthContext.js - UNIFIED VERSION
import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import authfirebase from '../../services/firebaseAuth';
import { API_URL } from "../constants/config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [userType, setUserType] = useState(null); // 'user' or 'admin'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authfirebase, async (firebaseUser) => {
      console.log('🔍 Firebase auth state changed:');
      console.log('- Email:', firebaseUser?.email);
      console.log('- UID:', firebaseUser?.uid);
      
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const token = await firebaseUser.getIdToken();
          console.log('🎫 Got Firebase token, checking user type...');

          // STEP 1: Try Admin collection first
          console.log('🔐 Checking Admin collection...');
          const adminRes = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firebaseUid: firebaseUser.uid }),
          });

          const adminData = await adminRes.json();
          console.log('🔐 Admin check response:', { status: adminRes.status, hasAdmin: !!adminData.admin });

          if (adminRes.ok && adminData.admin) {
            // User is an admin
            console.log('✅ ADMIN USER DETECTED');
            const mappedAdmin = {
              _id: adminData.admin._id,
              username: adminData.admin.username,
              email: adminData.admin.email,
              role: adminData.admin.role, // 'admin' or 'super_admin'
              permissions: adminData.admin.permissions || adminData.admin.getDefaultPermissions?.() || [],
              isActive: adminData.admin.isActive,
              lastLoginDate: adminData.admin.lastLoginDate,
            };

            setUserDetails(mappedAdmin);
            setUserType('admin');
            console.log('🎯 Set userType to: admin');
            console.log('📦 Admin details:', mappedAdmin);
            setLoading(false);
            return; // Exit early - don't check User collection
          }

          // STEP 2: Check User collection
          console.log('👤 Checking User collection...');
          const userRes = await fetch(`${API_URL}/api/auth/user/${firebaseUser.uid}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          console.log('👤 User check response:', userRes.status, userRes.ok);
          const userData = await userRes.json();
          console.log('📦 User data:', userData);

          if (userRes.ok && userData.user) {
            // Regular user
            console.log('✅ REGULAR USER DETECTED');
            const mappedUser = {
              _id: userData.user._id,
              username: userData.user.username,
              email: userData.user.email,
              role: userData.user.role || 'user',
              favoriteProducts: userData.user.favoriteProducts || [],
              infoCompleted: userData.user.infoCompleted,
              registrationDate: userData.user.registrationDate,
              ratingAverage: userData.user.ratingAverage,
              profilePictureUrl: userData.user.profilePictureUrl,
              address: userData.user.address,
              bio: userData.user.bio,
            };

            setUserDetails(mappedUser);
            setUserType('user');
            console.log('🎯 Set userType to: user');
            console.log('📦 User details:', mappedUser);
          } else {
            console.log('❌ User not found in either collection');
            setUserDetails(null);
            setUserType(null);
          }
        } catch (err) {
          console.error("💥 Error fetching user details:", err);
          setUserDetails(null);
          setUserType(null);
        }
      } else {
        console.log('🚪 User logged out');
        setUser(null);
        setUserDetails(null);
        setUserType(null);
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
      setUserType(null);
      console.log('✅ Logged out successfully');
    } catch (err) {
      console.log("❌ Logout error:", err);
    }
  };

  // Log state changes for debugging
  useEffect(() => {
    console.log('🔄 AuthContext State Update:');
    console.log('- User exists:', !!user);
    console.log('- Loading:', loading);
    console.log('- UserDetails exists:', !!userDetails);
    console.log('- UserType:', userType);
    console.log('- UserDetails.role:', userDetails?.role);
    console.log('- IsAdmin computed:', userType === 'admin');
  }, [user, loading, userDetails, userType]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userDetails, 
      userType, // 'user' or 'admin'
      logout,
      isAdmin: userType === 'admin',
      isUser: userType === 'user',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);