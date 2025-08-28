// screens/OtpScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function OtpScreen({ navigation }) {
  const [otp, setOtp] = useState(['', '', '', '']);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Automatically focus next input
    if (text && index < 3) {
      const nextInput = `input${index + 1}`;
      refs[nextInput]?.focus();
    }
  };

  const handleVerify = () => {
    const enteredOtp = otp.join('');
    console.log('Entered OTP:', enteredOtp);
    // Add your OTP verification logic here
  };

  const refs = {};

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>OTP Verification</Text>
      <Text style={styles.subtitle}>Enter the 4-digit code sent to your mobile number</Text>

      <View style={styles.otpContainer}>
        {otp.map((value, index) => (
          <TextInput
            key={index}
            ref={(ref) => (refs[`input${index}`] = ref)}
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={1}
            value={value}
            onChangeText={(text) => handleChange(text, index)}
          />
        ))}
      </View>

      <TouchableOpacity onPress={() => console.log('Resend OTP')} activeOpacity={0.7}>
        <Text style={styles.resend}>Didn't receive code? Resend OTP</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleVerify} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: width * 0.045,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 20,
  },
  otpInput: {
    width: width * 0.15,
    height: height * 0.07,
    borderWidth: 1,
    borderColor: '#2f95dc',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: width * 0.06,
    color: '#333',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  resend: {
    color: '#2f95dc',
    fontSize: width * 0.04,
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    width: '80%',
    backgroundColor: '#2f95dc',
    paddingVertical: height * 0.02,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.05,
    fontWeight: '600',
    textAlign: 'center',
  },
});
