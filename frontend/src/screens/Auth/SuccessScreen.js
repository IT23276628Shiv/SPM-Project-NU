// screens/SuccessScreen.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default function SuccessScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.checkmark}>✔</Text>
      <Text style={styles.title}>Password Changed!</Text>
      <Text style={styles.subtitle}>Your password has been changed successfully.</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.buttonText}>Go to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
    padding: 20,
  },
  checkmark: {
    fontSize: 60,
    color: "green",
    marginBottom: 20,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: "bold",
    color: "#2f95dc",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: width * 0.045,
    color: "#555",
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#2f95dc",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: width * 0.05,
    fontWeight: "600",
  },
});
