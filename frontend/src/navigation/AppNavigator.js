// navigation/AppNavigator.js
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotpasswordScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import InfoFormScreen from '../screens/Home/InfoFormScreen';
import AddProductScreen from '../screens/Home/AddProductScreen';
import ProductDetailsScreen from "../screens/Home/ProductDetailsScreen";
import CartScreen from "../screens/Home/CartScreen";
import ChatListScreen from "../screens/Chat/ChatListScreen";
import ChatScreen from "../screens/Chat/ChatScreen";
import MyActivityScreen from "../screens/Home/MyActivityScreen";
import SwapScreen from "../screens/Home/SwapScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

// Bottom Tabs for logged-in users
function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2f95dc',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'AddProduct') {
            iconName = focused ? 'plus-circle' : 'plus-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen 
        name="Messages" 
        component={ChatListScreen}
        options={{
          tabBarLabel: 'Messages',
        }}
      />
      <Tabs.Screen 
        name="AddProduct" 
        component={AddProductScreen}
        options={{
          tabBarLabel: 'Add Product',
        }}
      />
      <Tabs.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabs} />
      )}

      {/* Screens accessible from navigation */}
      <Stack.Screen 
        name="InfoForm" 
        component={InfoFormScreen}
        options={{
          headerShown: true,
          title: 'Complete Profile',
          headerStyle: { backgroundColor: '#2f95dc' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen}
        options={{
          headerShown: true,
          title: 'Product Details',
          headerStyle: { backgroundColor: '#2f95dc' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{
          headerShown: true,
          title: 'My Cart',
          headerStyle: { backgroundColor: '#2f95dc' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#2f95dc' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          // Title will be set dynamically in ChatScreen
        }}
      />
      <Stack.Screen name="MyActivity" component={MyActivityScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Stack.Screen name="Swap" component={SwapScreen} options={{ title: "Swap Product" }} />
    </Stack.Navigator>
  );
}

// Auth Stack for logged-out users
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2f95dc" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});