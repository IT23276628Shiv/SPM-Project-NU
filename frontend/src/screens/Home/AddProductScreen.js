import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

export default function AddProductScreen({ navigation }) {
  const { user } = useAuth();

  // Predefined categories
// Example category array from backend (replace with your API fetch)
const predefinedCategories = [
  { _id: "64ef7b2a8a1b2c3d4e5f6789", name: "Vehicles" },
  { _id: "64ef7b2a8a1b2c3d4e5f6790", name: "Phone" },
  { _id: "64ef7b2a8a1b2c3d4e5f6791", name: "Laptop" },
  { _id: "64ef7b2a8a1b2c3d4e5f6792", name: "Apartment" },
  { _id: "other", name: "Other" },
];

  const [categoryId, setCategoryId] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("good");
  const [price, setPrice] = useState("");
  const [isForSwap, setIsForSwap] = useState(false);
  const [swapPreferences, setSwapPreferences] = useState("");
  const [address, setAddress] = useState("");
  const [images, setImages] = useState([]);

  // Pick images (supports Android & iOS)
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to gallery!");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // iOS only, Android selects one
        quality: 0.7,
      });

      if (!result.canceled) {
        // Always map through result.assets to get URIs
        const uris = result.assets.map((a) => a.uri);
        setImages((prev) => [...prev, ...uris]);
      }
    } catch (err) {
      console.error("ImagePicker error:", err);
      Alert.alert("Error", "Could not pick images");
    }
  };

  // Upload single image to Cloudinary
  const uploadImageToCloudinary = async (uri) => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: `photo_${Date.now()}.jpg`,
    });
    data.append("upload_preset", "mobile_upload"); // set in Cloudinary
    data.append("cloud_name", "dvia7pu9t");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dvia7pu9t/image/upload",
        {
          method: "POST",
          body: data,
        }
      );
      const json = await res.json();
      return json.secure_url;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      throw err;
    }
  };

  // Submit product
const submitProduct = async () => {
  if (
    !title ||
    !categoryId ||
    (categoryId === "other" && !customCategory) ||
    !condition ||
    !address ||
    images.length === 0
  ) {
    Alert.alert("Error", "Please fill all required fields and add at least 1 image");
    return;
  }

  try {
    // Upload images to Cloudinary
    const uploadedUrls = [];
    for (const uri of images) {
      const data = new FormData();
      data.append("file", {
        uri,
        type: "image/jpeg",
        name: `photo_${Date.now()}.jpg`,
      });
      data.append("upload_preset", "YOUR_UPLOAD_PRESET"); // set in Cloudinary

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
        { method: "POST", body: data }
      );
      const json = await res.json();
      uploadedUrls.push(json.secure_url);
    }

    // Send to backend
    const token = await user.getIdToken();

    await axios.post(
      `${API_URL}/api/products`,
      {
        categoryId: categoryId === "other" ? customCategory : categoryId,
        title,
        description,
        condition,
        price,
        isForSwap,
        swapPreferences,
        address,
        imagesUrls: uploadedUrls,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    Alert.alert("Success", "Product added!");
    navigation.goBack();
  } catch (err) {
    console.error("Backend error:", err.response?.data || err.message);
    Alert.alert("Error", "Failed to add product");
  }
};


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Title*</Text>
      <TextInput
        style={styles.input}
        placeholder="Product title"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Product description"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Category*</Text>
      {predefinedCategories.map((cat) => (
        <TouchableOpacity
          key={cat._id}
          style={[
            styles.categoryBtn,
            categoryId === cat._id && styles.selectedCategory,
          ]}
          onPress={() => setCategoryId(cat._id)}
        >
          <Text
            style={[
              styles.categoryText,
              categoryId === cat._id && styles.selectedCategoryText,
            ]}
          >
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}

      {categoryId === "other" && (
        <TextInput
          style={styles.input}
          placeholder="Enter custom category"
          value={customCategory}
          onChangeText={setCustomCategory}
        />
      )}

      <Text style={styles.label}>Condition*</Text>
      {["new", "like_new", "good", "fair", "poor"].map((c) => (
        <TouchableOpacity
          key={c}
          style={[
            styles.conditionBtn,
            condition === c && styles.selectedCondition,
          ]}
          onPress={() => setCondition(c)}
        >
          <Text
            style={[
              styles.conditionText,
              condition === c && styles.selectedConditionText,
            ]}
          >
            {c}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Price</Text>
      <TextInput
        style={styles.input}
        placeholder="Price in $"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Address*</Text>
      <TextInput
        style={styles.input}
        placeholder="Your address"
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.label}>Swap Preferences</Text>
      <TextInput
        style={styles.input}
        placeholder="Optional"
        value={swapPreferences}
        onChangeText={setSwapPreferences}
      />

      <TouchableOpacity style={styles.imageBtn} onPress={pickImages}>
        <Text style={styles.imageBtnText}>Pick Images</Text>
      </TouchableOpacity>

      <ScrollView horizontal>
        {images.map((uri, idx) => (
          <Image
            key={idx}
            source={{ uri }}
            style={{ width: 100, height: 100, marginRight: 10 }}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.submitBtn} onPress={submitProduct}>
        <Text style={styles.submitText}>Submit Product</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontWeight: "bold", marginTop: 10, marginBottom: 5 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },
  categoryBtn: {
    backgroundColor: "#eee",
    padding: 8,
    borderRadius: 8,
    marginBottom: 5,
  },
  selectedCategory: { backgroundColor: "#2f95dc" },
  categoryText: { color: "#000" },
  selectedCategoryText: { color: "#fff", fontWeight: "bold" },
  conditionBtn: {
    backgroundColor: "#eee",
    padding: 8,
    borderRadius: 8,
    marginBottom: 5,
  },
  selectedCondition: { backgroundColor: "#ff6f61" },
  conditionText: { color: "#000" },
  selectedConditionText: { color: "#fff", fontWeight: "bold" },
  imageBtn: {
    backgroundColor: "#2f95dc",
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: "center",
  },
  imageBtnText: { color: "#fff", fontWeight: "bold" },
  submitBtn: {
    backgroundColor: "#ff6f61",
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
