// src/screens/Admin/AdminFeedbackScreen.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AdminFeedbackScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Admin Feedback Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold" },
});
