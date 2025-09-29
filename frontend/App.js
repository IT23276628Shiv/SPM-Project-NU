// frontend/App.js - UNIFIED VERSION
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AdminNavigator from "./src/navigation/AdminNavigator";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";

function MainApp() {
  const { userDetails, loading, user, userType } = useAuth();

  // Detailed logging for routing decision
  console.log("🚀 MainApp Render - Detailed Debug:");
  console.log("- Loading state:", loading);
  console.log("- Firebase user exists:", !!user);
  console.log("- Firebase user email:", user?.email);
  console.log("- UserDetails exists:", !!userDetails);
  console.log("- UserType:", userType);
  console.log("- UserDetails.role:", userDetails?.role);

  // Show loading screen while checking authentication
  if (loading) {
    console.log("⏳ Showing loading screen");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6F61" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Check if user details exist
  if (!userDetails) {
    console.log("❌ No user details - showing login screen");
    return <AppNavigator />;
  }

  // UNIFIED ROUTING DECISION based on userType
  console.log("🎯 ROUTING DECISION:");
  if (userType === 'admin' || userType === 'super_admin') {
    console.log("✅ ROUTING TO ADMIN INTERFACE");
    console.log("- UserType:", userType);
    console.log("- Role:", userDetails.role);
    return <AdminNavigator />;
  } else if (userType === 'user') {
    console.log("👤 ROUTING TO USER INTERFACE");
    console.log("- UserType:", userType);
    console.log("- Role:", userDetails.role);
    return <AppNavigator />;
  } else {
    // Fallback - shouldn't happen
    console.log("⚠️ UNKNOWN USER TYPE - showing login");
    return <AppNavigator />;
  }
}

export default function App() {
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});