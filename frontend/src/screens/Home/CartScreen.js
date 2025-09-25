import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "../../constants/config";

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  // Fetch favorites from backend
  const fetchFavorites = useCallback(async () => {
    if (!user) return setFavorites([]);

    try {
      setLoading(true);
      const token = await user.getIdToken(true);

      const res = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFavorites(res.data.favorites || []);
    } catch (e) {
      console.log("Error fetching favorites:", e.response?.data || e.message);
      Alert.alert("Error", e.response?.data?.error || "Could not fetch favorites");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Remove a favorite
  const removeFromFavorites = async (favId) => {
    if (!user) return;

    try {
      const token = await user.getIdToken(true);

      await axios.delete(`${API_URL}/api/favorites/${favId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update UI immediately
      setFavorites((prev) => prev.filter((f) => f._id !== favId));
      Alert.alert("Success", "Removed from favorites!");
    } catch (e) {
      console.log("Error removing favorite:", e.response?.data || e.message);
      Alert.alert("Error", e.response?.data?.error || "Could not remove favorite");
    }
  };

  // Refresh control
  const onRefresh = useCallback(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <View style={{ flex: 1, padding: 16, marginTop: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>My Favorites</Text>

      {favorites.length === 0 && !loading ? (
        <Text>No favorites yet</Text>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("ProductDetails", { product: item.productId })}
            >
              <Image source={{ uri: item.productId?.imagesUrls?.[0] }} style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.productId?.title}</Text>
                <Text style={styles.price}>LKR {item.productId?.price}</Text>
              </View>
              <TouchableOpacity
                onPress={() => removeFromFavorites(item._id)}
                style={styles.removeBtn}
              >
                <Text style={{ color: "red" }}>Remove</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    elevation: 2,
  },
  image: { width: 80, height: 80, borderRadius: 10, marginRight: 10 },
  info: { flex: 1, justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "600" },
  price: { fontSize: 14, color: "#ff6f61" },
  removeBtn: { padding: 6 },
});
