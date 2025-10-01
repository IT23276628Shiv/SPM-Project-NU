// frontend/App.js
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AdminNavigator from "./src/navigation/AdminNavigator";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { Client_iD } from "./src/constants/config";

// Make sure WebBrowser is initialized
WebBrowser.maybeCompleteAuthSession();

function MainApp() {
  const { userDetails, loading, user, userType } = useAuth();

  console.log("🚀 MainApp Render - Detailed Debug:");
  console.log("- Loading state:", loading);
  console.log("- Firebase user exists:", !!user);
  console.log("- Firebase user email:", user?.email);
  console.log("- UserDetails exists:", !!userDetails);
  console.log("- UserType:", userType);
  console.log("- UserDetails.role:", userDetails?.role);

  if (loading) {
    console.log("⏳ Showing loading screen");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6F61" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user || !userDetails) {
    console.log("❌ No user/userDetails - showing login screen");
    return <AppNavigator />;
  }

  const isAdmin =
    userType === "admin" ||
    userDetails?.role === "admin" ||
    userDetails?.role === "super_admin";

  if (isAdmin) {
    console.log("✅ ROUTING TO ADMIN INTERFACE");
    return <AdminNavigator />;
  } else {
    console.log("👤 ROUTING TO USER INTERFACE");
    return <AppNavigator />;
  }
}

export default function App() {
  console.log("Client_iD from app:", Client_iD);
  // Google Auth hook
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
      clientId: Client_iD,           // Web client ID
      useProxy: true,                // must be true for Expo Go
      redirectUri: 'https://projectuee-ccb28.firebaseapp.com/__/auth/handler' // Firebase redirect URI
    });

    
  useEffect(() => {
    
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(firebase.auth(), credential)
        .then(() => {
          console.log("✅ Google Sign-In successful!");
        })
        .catch((error) => {
          console.error("❌ Google Sign-In error:", error);
        });
    }
  }, [response]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});
