import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import authfirebase from '../../services/firebaseAuth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.8.156:5000';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    console.log('AuthContext - Starting onAuthStateChanged listener');
    const unsubscribe = onAuthStateChanged(authfirebase, async (firebaseUser) => {
      console.log('AuthContext - Firebase user state changed:', firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      } : 'No user');
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Fetch user details by firebaseUid to get _id and other details
          const userUrl = `${API_URL}/users/by-firebase/${firebaseUser.uid}`;
          console.log('AuthContext - Fetching userDetails from URL:', userUrl);
          const userRes = await fetch(userUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          console.log('AuthContext - User fetch response:', {
            status: userRes.status,
            ok: userRes.ok,
            headers: Object.fromEntries(userRes.headers.entries()),
            url: userRes.url,
          });
          if (!userRes.ok) {
            const errorText = await userRes.text();
            console.warn('AuthContext - User fetch not OK, response text:', errorText);
            setUserDetails({ error: 'User not found in database. Please re-login or check account.' });
            setLoading(false);
            return;
          }
          const userData = await userRes.json();
          console.log('AuthContext - Fetched userDetails:', JSON.stringify(userData, null, 2));
          setUserDetails({
            ...userData,
            firebaseUid: firebaseUser.uid, // Store firebaseUid
          }); // Expected: { _id, firebaseUid, username, profilePictureUrl, ... }
        } catch (err) {
          console.error('AuthContext - Error fetching user details:', err.message, err.stack);
          setUserDetails({ error: 'Failed to fetch user details. Please try again.' });
        }
      } else {
        console.log('AuthContext - No Firebase user, clearing user and userDetails');
        setUser(null);
        setUserDetails(null);
      }
      setLoading(false);
    });

    return () => {
      console.log('AuthContext - Unsubscribing from onAuthStateChanged');
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    console.log('AuthContext - Starting logout');
    try {
      await signOut(authfirebase);
      console.log('AuthContext - Logout successful');
      setUser(null);
      setUserDetails(null);
    } catch (err) {
      console.error('AuthContext - Logout error:', err.message, err.stack);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, userDetails, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);