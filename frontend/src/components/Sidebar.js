import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from "firebase/auth";
import authfirebase from '../../services/firebaseAuth';
import { useAuth } from '../context/AuthContext';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const { width, height } = Dimensions.get("window");

export default function Sidebar({ sidebarAnim, onClose }) {
//   const [user, setUser] = useState({ username: "Guest", email: "guest@example.com", profile: null });
  const navigation = useNavigation();

  const { user} = useAuth();

  

  const logout = async (navigation) => {
  try {
    await signOut(authfirebase);  // wait for logout to complete
    console.log("User logged out successfully");
    // navigation.navigate("Login"); // navigate to Login screen
  } catch (error) {
    console.log("Logout error:", error);
  }
};


  // Confirm logout alert
  const confirmLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout },
      ],
      { cancelable: true }
    );
  };

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            width: width * 0.75,
            transform: [{ translateX: sidebarAnim }],
          },
        ]}
      >
        {/* User Info */}
        <View style={styles.userInfo}>
          <Image
            source={
              user.profile
                ? { uri: user.profile }
                : require("../../assets/Profile.png")
            }
            style={styles.profileImage}
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>Guest</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <TouchableOpacity style={styles.sidebarItem} onPress={() => navigation.navigate("Home")}>
          <MaterialIcons name="home" size={22} color="#2f95dc" style={styles.icon} />
          <Text style={[styles.sidebarText, { color: "#2f95dc" }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarItem} >
          <MaterialIcons name="person" size={22} color="#2f95dc" style={styles.icon} />
          <Text style={[styles.sidebarText, { color: "#2f95dc" }]}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarItem} onPress={() => alert("My Orders")}>
          <MaterialIcons name="shopping-cart" size={22} color="#2f95dc" style={styles.icon} />
          <Text style={[styles.sidebarText, { color: "#2f95dc" }]}>My Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarItem}>
          <MaterialIcons name="favorite" size={22} color="#2f95dc" style={styles.icon} />
          <Text style={[styles.sidebarText, { color: "#2f95dc" }]}>My Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarItem}>
          <MaterialIcons name="add-box" size={22} color="#2f95dc" style={styles.icon} />
          <Text style={[styles.sidebarText, { color: "#2f95dc" }]}>Add Product</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarItem} onPress={() => alert("Settings")}>
          <MaterialIcons name="settings" size={22} color="#2f95dc" style={styles.icon} />
          <Text style={[styles.sidebarText, { color: "#2f95dc" }]}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sidebarItem} onPress={confirmLogout}>
          <MaterialIcons name="logout" size={22} color="#2f95dc" style={styles.icon} />
          <Text style={[styles.sidebarText, { color: "#2f95dc", fontWeight: "700" }]}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 9,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#fff",
    paddingTop: 40,
    paddingHorizontal: 20,
    zIndex: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 15,
    borderWidth: 3,
    borderColor: "#ff6f61",
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  email: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  sidebarText: {
    fontSize: 18,
    color: "#333",
  },
  icon: {
    marginRight: 15,
  },
});
