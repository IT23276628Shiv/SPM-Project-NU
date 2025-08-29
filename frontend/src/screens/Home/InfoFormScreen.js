import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const { width, height } = Dimensions.get('window');

const districts = [
  { label: 'Colombo', value: 'Colombo' },
  { label: 'Gampaha', value: 'Gampaha' },
  { label: 'Kandy', value: 'Kandy' },
  { label: 'Kurunegala', value: 'Kurunegala' },
  { label: 'Galle', value: 'Galle' },
  { label: 'Matara', value: 'Matara' },
  { label: 'Jaffna', value: 'Jaffna' },
  // Add all Sri Lanka districts here...
];

export default function InfoFormScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState(null);
  const [open, setOpen] = useState(false);

  const handleSearch = () => {
    if (!name || !phone || !district) {
      Alert.alert('Missing Info', 'Please fill all fields!');
      return;
    }
    Alert.alert('Search Info', `Name: ${name}\nPhone: ${phone}\nDistrict: ${district}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>User Information</Text>

      {/* Name */}
      <TextInput
        style={styles.input}
        placeholder="Enter Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />

      {/* Phone */}
      <TextInput
        style={styles.input}
        placeholder="Enter Phone Number"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {/* District Dropdown */}
      <DropDownPicker
        open={open}
        value={district}
        items={districts}
        setOpen={setOpen}
        setValue={setDistrict}
        placeholder="Select District"
        containerStyle={{ marginBottom: 20 }}
        style={styles.dropdown}
        dropDownStyle={{ backgroundColor: '#f5f5f5' }}
        searchable={true}
        searchPlaceholder="Search district..."
      />

      {/* Search Button */}
      <TouchableOpacity style={styles.button} onPress={handleSearch} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 50,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#2f95dc',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: height * 0.065,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: width * 0.045,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderRadius: 25,
    paddingHorizontal: 15,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: width * 0.05,
    fontWeight: '600',
    textAlign: 'center',
  },
});
