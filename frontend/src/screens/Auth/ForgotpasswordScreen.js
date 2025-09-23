// screens/ChangePasswordScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { getAuth,signInWithEmailAndPassword , updatePassword } from 'firebase/auth';
import authfirebase from '../../../services/firebaseAuth';


const { width, height } = Dimensions.get('window');

export default function ChangePasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false); // loading state

  const handleChangePassword = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true); // start loading
      const auth = getAuth();

      // Re-authenticate user
      const userCredential = await signInWithEmailAndPassword(authfirebase, email, password);
      const user = userCredential.user;

      await updatePassword(user, password);

      Alert.alert("Success", "Password changed successfully!", [
        { text: "OK", onPress: () => navigation.navigate("SuccessScreen") }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", error.message || "Something went wrong!");
    } finally {
      setLoading(false); // stop loading
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="New Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleChangePassword}
        disabled={loading} // disable while loading
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Password</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#2f95dc',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: height * 0.065,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: width * 0.045,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  button: {
    width: '100%',
    backgroundColor: '#2f95dc',
    paddingVertical: height * 0.02,
    borderRadius: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a1c8e9', // lighter blue when disabled
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.05,
    fontWeight: '600',
    textAlign: 'center',
  },
  backText: {
    color: '#2f95dc',
    fontSize: width * 0.045,
    fontWeight: '500',
    marginTop: 10,
  },
});
