// screens/WelcomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to RevoMart!</Text>

      {/* Thrift image */}
      <Image 
        source={require('../../assets/welcome.png')} // replace with your image path
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={styles.subtitle}>Discover thrift items, save big, and shop smart.</Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.replace('Login')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: width * 0.07, // responsive font size
    fontWeight: 'bold',
    color: '#2f95dc',
    textAlign: 'center',
    marginBottom: 20,
  },
  image: {
    width: width * 0.8,
    height: height * 0.3,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: width * 0.045,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#2f95dc',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.25,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.05,
    fontWeight: '600',
    textAlign: 'center',
  },
});
