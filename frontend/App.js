import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AdminNavigator from "./src/navigation/AdminNavigator";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";

function MainApp() {
  const { userDetails, loading, user } = useAuth();

  // Detailed logging for routing decision
  console.log("🚀 MainApp Render - Detailed Debug:");
  console.log("- Loading state:", loading);
  console.log("- Firebase user exists:", !!user);
  console.log("- Firebase user email:", user?.email);
  console.log("- UserDetails exists:", !!userDetails);
  console.log("- UserDetails object:", userDetails);
  console.log("- UserDetails.role:", userDetails?.role);
  console.log("- Role comparison result:", userDetails?.role === "admin");
  console.log("- Super admin check:", userDetails?.role === "super_admin");
  console.log("- Combined admin check:", userDetails?.role === "admin" || userDetails?.role === "super_admin");

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

  // Debug: Show routing decision
  console.log("🎯 ROUTING DECISION:");
  if (userDetails.role === "admin" || userDetails.role === "super_admin") {
    console.log("✅ ROUTING TO ADMIN INTERFACE");
    console.log("- Role:", userDetails.role);
    return <AdminNavigator />;
  } else {
    console.log("👤 ROUTING TO USER INTERFACE");
    console.log("- Role:", userDetails.role);
    console.log("- Why not admin: role is not 'admin' or 'super_admin'");
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
