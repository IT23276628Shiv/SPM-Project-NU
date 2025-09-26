// frontend/src/screens/SwapScreen.jsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SectionList,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";

export default function SwapScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { product } = route.params || {}; // Seller's product
  const { user } = useAuth();

  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch buyer's products
  useEffect(() => {
    const fetchMyProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products`);
        const data = await res.json();

        if (res.ok) {
          // 🔹 Only my products
          const mine = (data || []).filter(
            (p) => p.ownerId?.firebaseUid === user?.uid
          );

          // 🔹 Only "available"
          const available = mine.filter(
            (p) => p.status?.toLowerCase() === "available"
          );

          // 🔹 Price match ONLY (no category restriction)
          const matching = available.filter(
            (p) => Number(p.price) === Number(product.price)
          );

          setMyProducts(matching);
        } else {
          Alert.alert("Error", data.error || "Failed to fetch products");
        }
      } catch (err) {
        console.error("Error fetching swap products:", err);
        Alert.alert("Error", "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchMyProducts();
  }, []);

  const handleConfirmSwap = async () => {
    if (!selectedProduct) {
      return Alert.alert(
        "Select Product",
        "Please select one of your products for swap."
      );
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/products/${product._id}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buyerId: user.uid, // logged-in buyer
          buyerProductId: selectedProduct._id, // product they’re offering
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("✅ Success", "Swap request sent to seller!");
        navigation.goBack();
      } else {
        Alert.alert("Error", data.error || "Failed to send swap request");
      }
    } catch (err) {
      console.error("Swap error:", err);
      Alert.alert("Error", "Something went wrong");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  // Group by category for nicer UI
  const sections = myProducts.reduce((acc, item) => {
    const category = item.category || "Other";
    const existing = acc.find((s) => s.title === category);
    if (existing) {
      existing.data.push(item);
    } else {
      acc.push({ title: category, data: [item] });
    }
    return acc;
  }, []);

  return (
    <View style={styles.container}>
      {/* Seller’s Product */}
      <View style={styles.sellerProduct}>
        <Text style={styles.sectionTitle}>Product You Want</Text>
        <Image source={{ uri: product.imagesUrls?.[0] }} style={styles.image} />
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>
          LKR {Number(product.price).toLocaleString()}
        </Text>
      </View>

      {/* Your Products */}
      <Text style={styles.sectionTitle}>Select One of Your Products</Text>

      {myProducts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noProductText}>
            No products with matching price available for swap.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.categoryHeader}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.productCard,
                selectedProduct?._id === item._id && styles.selectedCard,
              ]}
              onPress={() => setSelectedProduct(item)}
            >
              <Image
                source={{ uri: item.imagesUrls?.[0] }}
                style={styles.imageSmall}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.priceSmall}>
                  LKR {Number(item.price).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Confirm Button */}
      {myProducts.length > 0 && (
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmSwap}>
          <Text style={styles.confirmBtnText}>Confirm Swap</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
  sellerProduct: {
    alignItems: "center",
    marginBottom: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    backgroundColor: "#fafafa",
  },
  image: { width: 200, height: 200, borderRadius: 10 },
  imageSmall: { width: 80, height: 80, borderRadius: 8 },
  title: { fontSize: 18, fontWeight: "bold", marginTop: 8 },
  productTitle: { fontSize: 16, fontWeight: "600" },
  price: { fontSize: 16, color: "#ff6f61" },
  priceSmall: { fontSize: 14, color: "#666" },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 1,
  },
  selectedCard: { borderColor: "#4caf50", backgroundColor: "#e8f5e9" },
  categoryHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
    color: "#333",
  },
  confirmBtn: {
    backgroundColor: "#4caf50",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },
  confirmBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  noProductText: { fontSize: 16, color: "#888", marginTop: 20 },
});
