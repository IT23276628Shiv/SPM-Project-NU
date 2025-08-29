import React, { useState } from 'react';
import { 
  View, TextInput, TouchableOpacity, Alert, Text, StyleSheet, Modal, FlatList, TouchableWithoutFeedback, Dimensions 
} from 'react-native';
import { createUserWithEmailAndPassword } from "firebase/auth";
import authfirebase from '../../../services/firebaseAuth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// List of Sri Lankan districts
const districts = [
  "Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha",
  "Hambantota","Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala",
  "Mannar","Matale","Matara","Monaragala","Mullaitivu","Nuwara Eliya","Polonnaruwa",
  "Puttalam","Ratnapura","Trincomalee","Vavuniya"
];

export default function InfoFormScreen({ route, navigation }) {
  const { userId, email, password, name } = route.params;

  console.log("passwordHash :: " , password)

  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredDistricts = districts.filter(d => 
    d.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!phoneNumber.trim() || !selectedDistrict) {
      Alert.alert("Error", "Please fill all required fields.");
      return;
    }

    try {
      // Firebase registration
      const userCredential = await createUserWithEmailAndPassword(authfirebase, email, password);
      const firebaseUid = userCredential.user.uid;

      // Update MongoDB
      const response = await fetch(
        `${API_URL}/api/auth/${userId}/updateProfile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            phoneNumber, bio, address: selectedDistrict, firebaseUid
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Profile completed and account created!");
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        Alert.alert("Error", data.message || "Failed to update profile.");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Complete Your Profile</Text>

      <TextInput
        placeholder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <TextInput
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
        multiline
      />

      {/* District Dropdown */}
      <TouchableOpacity 
        style={styles.input} 
        onPress={() => setDropdownVisible(true)}
      >
        <Text style={{color: selectedDistrict ? '#000' : '#888'}}>
          {selectedDistrict || "Select District"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="slide"
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}/>
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <TextInput
            placeholder="Search District"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
          <FlatList
            data={filteredDistricts}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.districtItem}
                onPress={() => {
                  setSelectedDistrict(item);
                  setDropdownVisible(false);
                  setSearchText('');
                }}
              >
                <Text>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f7f7'
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    alignSelf: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContainer: {
    position: 'absolute',
    top: height * 0.2,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: height * 0.6,
    padding: 10
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10
  },
  districtItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  }
});
