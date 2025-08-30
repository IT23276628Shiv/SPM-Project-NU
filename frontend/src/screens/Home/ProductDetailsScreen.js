import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRoute } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function ProductDetailsScreen() {
  const route = useRoute();
  const { product } = route.params || {};

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>No product found</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Image carousel */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {product.imagesUrls?.map((img, idx) => (
          <Image key={idx} source={{ uri: img }} style={styles.image} />
        ))}
      </ScrollView>

      <View style={styles.details}>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>LKR. {product.price}</Text>
        <Text style={styles.condition}>Condition: {product.condition}</Text>
        <Text style={styles.description}>
          {product.description || "No description available"}
        </Text>
        {product.swapPreferences && (
          <Text style={styles.swap}>
            Swap Preferences: {product.swapPreferences}
          </Text>
        )}
        {product.address && (
          <Text style={styles.address}>Location: {product.address}</Text>
        )}
      </View>

      <TouchableOpacity style={styles.buyBtn}>
        <Text style={styles.buyBtnText}>Add to Cart</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 20 },
  image: {
    width,
    height: 300,
    resizeMode: "cover",
  },
  details: { padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  price: { fontSize: 20, fontWeight: "bold", color: "#ff6f61", marginBottom: 6 },
  condition: { fontSize: 14, color: "#666", marginBottom: 10 },
  description: { fontSize: 14, color: "#444", lineHeight: 20, marginBottom: 10 },
  swap: { fontSize: 14, color: "#333", marginBottom: 6 },
  address: { fontSize: 14, color: "#555", marginBottom: 10 },
  buyBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#ff6f61",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buyBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
