// screens/RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { createUserWithEmailAndPassword } from "firebase/auth";
import authfirebase from '../../../services/firebaseAuth';
import { Ionicons } from '@expo/vector-icons'; // for eye icon
import { Alert } from 'react-native';
import { onAuthStateChanged, signOut } from "firebase/auth";


const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength check
  const getPasswordStrength = (pwd) => {
    let conditions = 0;
    if (/[A-Z]/.test(pwd)) conditions++;       // Uppercase
    if (/[a-z]/.test(pwd)) conditions++;       // Lowercase
    if (/\d.*\d/.test(pwd)) conditions++;      // At least 2 digits
    if (/[@#$%&*]/.test(pwd)) conditions++;    // Special char

    if (conditions <= 2) return { level: 'Weak', color: 'red' };
    if (conditions === 3) return { level: 'Medium', color: 'orange' };
    if (conditions === 4) return { level: 'Strong', color: 'green' };
    return { level: 'Weak', color: 'red' };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    let valid = true;
    let newErrors = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Name is required";
      valid = false;
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailPattern)) {
      newErrors.email = "Enter a valid email";
      valid = false;
    }

    // Password validation
    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      valid = false;
    } else if (passwordStrength.level === "Weak") {
      newErrors.password = "Create a strong password";
      valid = false;
    }

    // Confirm Password
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };


  const handleRegister = async () => {
  if (!validateForm()) return;

  try {
    const response = await fetch("http://192.168.1.230:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name, email, passwordHash:password }) // no firebaseUid here
    });

    const data = await response.json();
    console.log("Backend Response:", data);

    if (response.ok) {
      // Navigate to InfoFormScreen with MongoDB userId and previous email/password
      navigation.replace("InfoForm", { 
        userId: data.userId, 
        email, 
        password, 
        name 
      });
    } else {
      Alert.alert("Error", data.message);
    }

  } catch (error) {
    console.log(error);
    Alert.alert("Error", "Something went wrong!");
  }
};





  const handleGoogleRegister = () => {
    console.log('Register with Google');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join RevoMart to discover thrift items and great deals!</Text>

        {/* Name Input */}
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        {/* Email Input */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {/* Password Input with Eye */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#555" />
          </TouchableOpacity>
        </View>
        {password.length > 0 && (
          <View style={styles.strengthBarContainer}>
            <View style={[styles.strengthBar, { backgroundColor: passwordStrength.color, width: `${(passwordStrength.level === 'Weak' ? 33 : passwordStrength.level === 'Medium' ? 66 : 100)}%` }]} />
          </View>
        )}
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        {/* Confirm Password Input with Eye */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Confirm Password"
            placeholderTextColor="#888"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#555" />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

        {/* Register Button */}
        <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        {/* Firebase Error */}
        {errors.firebase && <Text style={styles.errorText}>{errors.firebase}</Text>}

        {/* OR Divider */}
        <View style={styles.orContainer}>
          <View style={styles.line} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.line} />
        </View>

        {/* Google Register */}
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleRegister} activeOpacity={0.8}>
          <Image 
            source={require('../../../assets/google.png')}
            style={styles.googleIcon}
          />
          <Text style={styles.googleText}>Register with Google</Text>
        </TouchableOpacity>

        {/* Already have account */}
        <View style={styles.loginContainer}>
          <Text style={{ color: '#555' }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 40 },
  title: { fontSize: width * 0.08, fontWeight: 'bold', color: '#2f95dc', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: width * 0.045, color: '#555', textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
  input: { width: '100%', height: height * 0.065, backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 20, fontSize: width * 0.045, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 15, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  inputPassword: { flex: 1, height: height * 0.065, fontSize: width * 0.045 },
  strengthBarContainer: { width: '100%', height: 6, backgroundColor: '#eee', borderRadius: 5, marginBottom: 10, overflow: 'hidden' },
  strengthBar: { height: '100%' },
  errorText: { color: 'red', fontSize: 14, marginBottom: 8, alignSelf: 'flex-start' },
  button: { width: '100%', backgroundColor: '#2f95dc', paddingVertical: height * 0.02, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5, marginBottom: 20, marginTop: 10 },
  buttonText: { color: '#fff', fontSize: width * 0.05, fontWeight: '600', textAlign: 'center' },
  orContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '80%' },
  line: { flex: 1, height: 1, backgroundColor: '#ccc' },
  orText: { marginHorizontal: 10, fontSize: width * 0.045, color: '#555' },
  googleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', width: '100%', paddingVertical: height * 0.018, borderRadius: 30, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3, marginBottom: 30 },
  googleIcon: { width: width * 0.06, height: width * 0.06, marginRight: 10 },
  googleText: { fontSize: width * 0.045, color: '#555', fontWeight: '500' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: '#2f95dc', fontWeight: '600' },
});
