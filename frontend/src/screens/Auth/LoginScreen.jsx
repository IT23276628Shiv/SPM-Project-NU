import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import Input from "../../components/Input";
import Button from "../../components/Button";
import colors from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Error", "Please enter email and password");
    }

    setLoading(true);
    try {
      await signIn({ email, password });
    } catch (error) {
      let message = "Login failed. Please try again.";
      if (error.response) {
        switch (error.response.status) {
          case 401:
            message = "Invalid email or password";
            break;
          case 429:
            message = "Too many attempts. Try again later.";
            break;
          case 403:
            message = "Account not verified";
            break;
          default:
            message = "An unexpected error occurred";
        }
      }
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OLX Login</Text>
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? "Logging in..." : "Login"}
        onPress={onLogin}
        disabled={loading}
      />
      <Text style={styles.hint}>Please enter your credentials to log in.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    color: colors.text,
    textAlign: "center",
  },
  hint: { color: colors.muted, marginTop: 12, textAlign: "center" },
});
