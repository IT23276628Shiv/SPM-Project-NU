// screens/RegisterScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, 
  KeyboardAvoidingView, Platform, ScrollView, Image, Alert, Animated 
} from 'react-native';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import authfirebase from '../../../services/firebaseAuth';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from "../../constants/config";
import { Client_iD } from '../../constants/config'; // Firebase Web Client ID
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const getPasswordStrength = (pwd) => {
    const conditions = [
      pwd.length >= 8,
      /[A-Z]/.test(pwd),
      /[a-z]/.test(pwd),
      /\d/.test(pwd),
      /[@#$%^&*!]/.test(pwd),
      pwd.length >= 12
    ];
    const score = conditions.filter(Boolean).length;
    if (score <= 2) return { level: 'Weak', color: '#FF3B30', width: '33%' };
    if (score <= 4) return { level: 'Medium', color: '#FF9500', width: '66%' };
    return { level: 'Strong', color: '#2F6F61', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    let valid = true;
    let newErrors = {};

    if (!name.trim()) { newErrors.name = "Name is required"; valid = false; }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailPattern)) { newErrors.email = "Enter a valid email"; valid = false; }
    if (password.length < 8) { newErrors.password = "Password must be at least 8 characters"; valid = false; }
    else if (passwordStrength.level === "Weak") { newErrors.password = "Create a stronger password"; valid = false; }
    if (password !== confirmPassword) { newErrors.confirmPassword = "Passwords do not match"; valid = false; }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, email, password })
      });
      const data = await response.json();
      if (response.ok) {
        navigation.replace("InfoForm", { userId: data.userId, email, password, name });
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong!");
    }
  };

  // ----------------------- Google Auth -----------------------
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Client_iD, // Firebase Web Client ID
    useProxy: true,
    redirectUri: makeRedirectUri({ useProxy: true }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (!idToken) return;

      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(authfirebase, credential)
        .then((userCredential) => {
          const user = userCredential.user;
          navigation.replace('InfoForm', {
            userId: user.uid,
            email: user.email,
            password: '',
            name: user.displayName,
          });
        })
        .catch((err) => {
          console.log("Firebase Google sign-in error:", err);
          Alert.alert("Error", "Google sign-in failed");
        });
    }
  }, [response]);

  const handleGoogleRegister = () => {
    if (request) promptAsync();
    else Alert.alert("Error", "Google sign-in not ready");
  };

  // ----------------------- UI -----------------------
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.backgroundOrb} />
      <View style={[styles.backgroundOrb, styles.backgroundOrb2]} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}><Text style={styles.logoText}>RM</Text></View>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Join RevoMart and start your thrift journey today!</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>

            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Enter your full name"
                placeholderTextColor="#8E8E93"
                value={name}
                onChangeText={setName}
              />
              {errors.name && <Animated.Text style={[styles.errorText, { transform: [{ translateX: shakeAnimation }] }]} onLayout={shake}>{errors.name}</Animated.Text>}
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your@email.com"
                placeholderTextColor="#8E8E93"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Animated.Text style={[styles.errorText, { transform: [{ translateX: shakeAnimation }] }]}>{errors.email}</Animated.Text>}
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.passwordWrapper, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.inputPassword}
                  placeholder="Create a strong password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={showPassword ? "#2F6F61" : "#8E8E93"} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[styles.passwordWrapper, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.inputPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#8E8E93"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={showConfirmPassword ? "#2F6F61" : "#8E8E93"} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleRegister}>
              <Image source={require('../../../assets/google.png')} style={styles.googleIcon} />
              <Text style={styles.googleText}>Sign up with Google</Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ----------------------- Styles -----------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0C', position: 'relative' },
  backgroundOrb: { position: 'absolute', width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6, backgroundColor: '#1A1D21', top: -width * 0.3, right: -width * 0.4, opacity: 0.6 },
  backgroundOrb2: { backgroundColor: '#2F6F61', top: 'auto', bottom: -width * 0.5, left: -width * 0.3, right: 'auto', opacity: 0.3 },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 20 },
  content: { flex: 1 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  logoContainer: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(47, 111, 97, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(47, 111, 97, 0.5)', marginBottom: 20 },
  logoText: { fontSize: 20, fontWeight: '900', color: '#2F6F61', letterSpacing: -1 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8E8E93', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  formContainer: { flex: 1 },
  inputContainer: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8, marginLeft: 4 },
  input: { width: '100%', height: 56, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, paddingHorizontal: 20, fontSize: 16, color: '#FFFFFF', fontWeight: '500', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.1)' },
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 56, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.1)' },
  inputPassword: { flex: 1, height: 56, fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  eyeButton: { padding: 8 },
  inputError: { borderColor: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.1)' },
  button: { width: '100%', backgroundColor: '#2F6F61', paddingVertical: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  googleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', width: '100%', paddingVertical: 16, borderRadius: 16, justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 30 },
  googleIcon: { width: 20, height: 20, marginRight: 12 },
  googleText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 'auto', paddingTop: 20 },
  loginText: { fontSize: 16, color: '#8E8E93', fontWeight: '500' },
  loginLink: { color: '#2F6F61', fontWeight: '700', fontSize: 16, marginLeft: 4 },
});
