import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
import Layout from "../../components/Layouts";

export default function MyActivityScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [myProducts, setMyProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch ONLY my products
  const fetchMyProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products`);
      // 🔹 Filter by firebaseUid (same as HomeScreen check)
      const filtered = (res.data || []).filter(
        (p) => p.ownerId?.firebaseUid === user?.uid
      );
      setMyProducts(filtered);
    } catch (err) {
      console.log("Error fetching my products:", err.response?.data || err.message);
      setMyProducts([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyProducts();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyProducts().finally(() => setRefreshing(false));
  }, []);

  // Format price with commas
  const formatPrice = (price) => {
    if (!price) return "N/A";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <Layout>
      {/* Add Product */}
      <TouchableOpacity
        style={styles.addProductBtn}
        onPress={() => {
        //  console.log("Navigating to AddProduct screen");
          navigation.navigate("AddProduct");
        }}
      >
        <Text style={styles.addProductText}>+ Add Product</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>My Products</Text>
        <View style={styles.itemsContainer}>
          {myProducts.length === 0 && (
            <Text style={{ textAlign: "center", color: "#777", width: "100%" }}>
              You haven’t listed any products yet
            </Text>
          )}

          {myProducts.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.card}
              onPress={() =>
                navigation.navigate("ProductDetails", { product: item })
              }
            >
              {item.imagesUrls?.[0] ? (
                <Image
                  source={{ uri: item.imagesUrls[0] }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={[styles.cardImage, { backgroundColor: "#ccc" }]} />
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardPrice}>
                  LKR. {formatPrice(item.price)}
                </Text>
                <Text style={styles.cardCondition}>
                  Condition: {item.condition}
                </Text>

                {/* Owner always = current user, so show badge */}
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Your Product</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  addProductBtn: {
    backgroundColor: "#2f95dc",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  addProductText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#ff6f61",
  },
  itemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  cardImage: { width: "100%", height: 140 },
  cardInfo: { padding: 10 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  cardPrice: { fontSize: 14, color: "#ff6f61", fontWeight: "bold" },
  cardCondition: { fontSize: 12, color: "#555", marginTop: 2 },
  ownerBadge: {
    marginTop: 10,
    backgroundColor: "#2f95dc",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  ownerBadgeText: { color: "#fff", fontWeight: "bold" },
});
