// AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotpasswordScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import InfoFormScreen from '../screens/Home/InfoFormScreen';
import AddProductScreen from '../screens/Home/AddProductScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2f95dc',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      {/* <Tabs.Screen name="InfoForm" component={InfoFormScreen} /> */}
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
      <Tabs.Screen name="AddProduct" component={AddProductScreen} />

      
    </Tabs.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if(user!=null){
    console.log("IAM IN APPNAVIGATOR  User_ID :: ", user.uid);
    console.log("IAM IN APPNAVIGATOR  User_Email :: ", user.email);
    // Accessing metadata for createdAt and lastSignInAt
  console.log("Created At:", user.metadata?.creationTime);      // human-readable string
  console.log("Last Login At:", user.metadata?.lastSignInTime); // human-readable string

  // If you want them as timestamps
  console.log("Created At (timestamp):", user.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : null);
  console.log("Last Login At (timestamp):", user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : null);
  }

  if (loading) {
    return null; // optional splash/loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // Logged-in user sees Main Tabs
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        // Logged-out user sees auth screens
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
