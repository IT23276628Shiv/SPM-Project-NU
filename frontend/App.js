import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AdminNavigator from "./src/navigation/AdminNavigator";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";

function MainApp() {
  const { userDetails, loading, user } = useAuth();

  // Add detailed logging
  console.log("🔍 MainApp Debug Info:");
  console.log("- Loading:", loading);
  console.log("- User exists:", !!user);
  console.log("- UserDetails:", userDetails);
  console.log("- UserDetails.role:", userDetails?.role);
  console.log("- Is admin check:", userDetails?.role === "admin");

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6F61" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Debug: Show current state
  if (__DEV__) {
    console.log("🎯 Routing Decision:");
    if (userDetails?.role === "admin") {
      console.log("✅ Showing Admin Interface");
    } else {
      console.log("👤 Showing User Interface");
      console.log("- Reason: role is", userDetails?.role);
    }
  }

  // If user is admin, show admin interface
  if (userDetails?.role === "admin" || userDetails?.role === "super_admin") {
    console.log("🔐 Rendering Admin Interface");
    return <AdminNavigator />;
  }

  // Otherwise show regular user interface
  console.log("👤 Rendering User Interface");
  return <AppNavigator />;
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
