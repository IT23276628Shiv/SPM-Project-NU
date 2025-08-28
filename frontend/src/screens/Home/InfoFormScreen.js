// screens/InfoFormScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Layout from '../../components/Layouts';
import { CommonActions } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const districts = [
  { label: 'Colombo', value: 'Colombo' },
  { label: 'Gampaha', value: 'Gampaha' },
  { label: 'Kalutara', value: 'Kalutara' },
  { label: 'Kandy', value: 'Kandy' },
  { label: 'Matale', value: 'Matale' },
  { label: 'Nuwara Eliya', value: 'Nuwara Eliya' },
  { label: 'Galle', value: 'Galle' },
  { label: 'Matara', value: 'Matara' },
  { label: 'Hambantota', value: 'Hambantota' },
  { label: 'Jaffna', value: 'Jaffna' },
  { label: 'Kilinochchi', value: 'Kilinochchi' },
  { label: 'Mannar', value: 'Mannar' },
  { label: 'Vavuniya', value: 'Vavuniya' },
  { label: 'Mullaitivu', value: 'Mullaitivu' },
  { label: 'Batticaloa', value: 'Batticaloa' },
  { label: 'Ampara', value: 'Ampara' },
  { label: 'Trincomalee', value: 'Trincomalee' },
  { label: 'Kurunegala', value: 'Kurunegala' },
  { label: 'Puttalam', value: 'Puttalam' },
  { label: 'Anuradhapura', value: 'Anuradhapura' },
  { label: 'Polonnaruwa', value: 'Polonnaruwa' },
  { label: 'Badulla', value: 'Badulla' },
  { label: 'Monaragala', value: 'Monaragala' },
  { label: 'Ratnapura', value: 'Ratnapura' },
  { label: 'Kegalle', value: 'Kegalle' },
];

export default function InfoFormScreen({ route, navigation }) {
  const { userId } = route.params; // MongoDB ObjectId
  console.log("InfoFormScreen :: MongoDB ID", userId);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const [open, setOpen] = useState(false);
  const [districtList, setDistrictList] = useState(districts);

  // Submit handler
  const handleSubmit = async () => {
  if (!phoneNumber.trim() || !selectedDistrict) {
    Alert.alert("Error", "Please fill all required fields.");
    return;
  }

  try {
    const response = await fetch(
      `http://192.168.1.230:5000/api/auth/${userId}/updateProfile`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, bio, address: selectedDistrict }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      Alert.alert("Success", "Profile updated successfully!");
      navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'MainTabs' }],
  })
);
    } else {
      Alert.alert("Error", data.message || "Failed to update profile.");
    }
  } catch (error) {
    console.log(error);
    Alert.alert("Error", "Something went wrong!");
  }
};


  return (
    <Layout>
      <View style={styles.containerBackground}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Complete Your Profile</Text>

          {/* Phone Number Input */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>

          {/* Bio Input */}
          <View style={styles.inputCard}>
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Bio"
              value={bio}
              onChangeText={setBio}
              multiline
              placeholderTextColor="#999"
            />
          </View>

          {/* District Dropdown */}
          <View style={styles.inputCard}>
            <DropDownPicker
              open={open}
              value={selectedDistrict}
              items={districtList}
              setOpen={setOpen}
              setValue={setSelectedDistrict}
              setItems={setDistrictList}
              placeholder="Select Your District"
              searchable={true}
              listMode="MODAL"
              modalProps={{ animationType: 'slide' }}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  containerBackground: {
    flex: 1,
    backgroundColor: '#e0f7fa',
  },
  container: {
    flexGrow: 1,
    padding: width * 0.05,
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
    textAlign: 'center',
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  input: {
    fontSize: width * 0.045,
    color: '#333',
  },
  dropdown: {
    borderWidth: 0,
  },
  dropdownContainer: {
    borderRadius: 12,
  },
  button: {
    backgroundColor: '#00796b',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: width * 0.05,
  },
});
