import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Header({ onMenuPress }) {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>REVOMART</Text>
      <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress}>
        <Text style={{ fontSize: 28 }}>☰</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: '#2f95dc',
  },
  menuBtn: {
    padding: 8,
  },
});
