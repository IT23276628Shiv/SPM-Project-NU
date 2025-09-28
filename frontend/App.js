// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AdminNavigator from "./src/navigation/AdminNavigator";

function MainApp() {
  const { userDetails } = useAuth();

  if (userDetails?.role === "admin") {
    return <AdminNavigator />;
  }
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
