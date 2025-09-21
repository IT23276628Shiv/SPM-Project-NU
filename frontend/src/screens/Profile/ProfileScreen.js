import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Dimensions } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import { API_URL } from "../../constants/config";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const { user, signOut, userDetails } = useAuth();
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");

  const handleEdit = (field) => {
    setEditField(field);
    setEditValue(userDetails[field] || "");
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_URL}/users/${user.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editField]: editValue }),
      });
      const data = await res.json();
      setEditField(null);
      setEditValue("");
    } catch (err) {
      console.log("Error updating user:", err);
      Alert.alert("Error", "Failed to update. Try again.");
    }
  };

  const handleCancel = () => {
    setEditField(null);
    setEditValue("");
  };

  if (!userDetails) return <Text style={{ textAlign: "center", marginTop: 50 }}>Loading...</Text>;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.profilePicContainer}>
        {userDetails.profilePictureUrl ? (
          <Image source={{ uri: userDetails.profilePictureUrl }} style={styles.profilePic} />
        ) : (
          <MaterialCommunityIcons name="account-circle" size={120} color={colors.primary} />
        )}
        <Text style={styles.username}>{userDetails.username}</Text>
        <Text style={styles.email}>{userDetails.email}</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.infoContainer}>
        {[
          { label: "Phone", key: "phoneNumber", icon: "phone" },
          { label: "Bio", key: "bio", icon: "account" },
          { label: "Address", key: "address", icon: "map-marker" },
        ].map((field) => (
          <View key={field.key} style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name={field.icon} size={24} color={colors.primary} />
              {editField === field.key ? (
                <>
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    style={styles.input}
                    placeholder={`Enter ${field.label}`}
                  />
                  <TouchableOpacity onPress={handleSave}>
                    <MaterialCommunityIcons name="check" size={24} color="green" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancel}>
                    <MaterialCommunityIcons name="close" size={24} color="red" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.infoText}>{userDetails[field.key] || "-"}</Text>
                  <TouchableOpacity onPress={() => handleEdit(field.key)}>
                    <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Extra Info */}
      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Rating</Text>
          <Text style={styles.cardValue}>{userDetails.ratingAverage?.toFixed(1) || "0"}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Favorites</Text>
          <Text style={styles.cardValue}>{userDetails.favoriteProducts?.length || 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Info Completed</Text>
          <Text style={styles.cardValue}>{userDetails.infoCompleted ? "Yes" : "No"}</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  profilePicContainer: { alignItems: "center", marginVertical: 20 },
  profilePic: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
  username: { fontSize: 22, fontWeight: "bold", color: "#333" },
  email: { fontSize: 16, color: "gray" },
  infoContainer: { paddingHorizontal: 20 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  infoRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  infoText: { fontSize: 16, color: "#000", flex: 1, marginLeft: 10 },
  input: { borderBottomWidth: 1, borderBottomColor: "gray", flex: 1, marginLeft: 10 },
  cardsContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 20, paddingHorizontal: 10 },
  card: { flex: 1, backgroundColor: "#fff", padding: 20, marginHorizontal: 5, borderRadius: 15, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  cardLabel: { color: "gray", fontSize: 14 },
  cardValue: { fontSize: 18, fontWeight: "bold", marginTop: 5 },
  logoutBtn: { marginTop: 30, padding: 15, backgroundColor: colors.primary, borderRadius: 10, alignItems: "center", marginHorizontal: 20 },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
