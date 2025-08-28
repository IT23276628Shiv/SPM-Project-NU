// Layout.js
import React, { useState, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated } from "react-native";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

const { width } = Dimensions.get("window");

export default function Layout({ children }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-width * 0.7)).current;

  const toggleSidebar = () => {
    if (sidebarVisible) {
      Animated.timing(sidebarAnim, {
        toValue: -width * 0.7,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setSidebarVisible(false));
    } else {
      setSidebarVisible(true);
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const closeSidebar = () => {
    if (sidebarVisible) toggleSidebar();
  };

  return (
    <View style={styles.container}>
      <Header onMenuPress={toggleSidebar} />
      {children}
      {sidebarVisible && (
        <Sidebar sidebarAnim={sidebarAnim} onClose={closeSidebar} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
});
