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
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const { width } = Dimensions.get("window");

export default function ProductDetailsScreen() {
  const route = useRoute();
  const { product } = route.params || {};


const formatPrice = (price) => {
  if (!price) return "N/A";
  return Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

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
        {product.imagesUrls?.length > 0 ? (
          product.imagesUrls.map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.image} />
          ))
        ) : (
          <View style={styles.noImage}>
            <Text>No Images Available</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.details}>
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>LKR. {formatPrice(product.price)}</Text>
        <Text style={styles.condition}>Condition: {product.condition}</Text>
        <Text style={styles.description}>
          {product.description || "No description available"}
        </Text>

        {/* Owner and Category */}
        {product.ownerName && <Text style={styles.field}>Owner: {product.ownerName}</Text>}
        {product.ownerContact && (<Text style={styles.field}>Contact No: {product.ownerContact}</Text>)}
        {product.categoryName && <Text style={styles.field}>Category: {product.categoryName}</Text>}

        {/* Extra fields */}
        <Text style={styles.field}>Status: {product.status}</Text>
        <Text style={styles.field}>Views: {product.viewsCount}</Text>
        <Text style={styles.field}>Listed On: {new Date(product.listedDate).toDateString()}</Text>

        {product.isForSwap && <Text style={styles.field}>Available for Swap ✅</Text>}
        {product.swapPreferences && <Text style={styles.field}>Swap Preferences: {product.swapPreferences}</Text>}
        {product.address && <Text style={styles.field}>Location: {product.address}</Text>}
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.buyBtn}>
          <Text style={styles.buyBtnText}>Buy</Text>
        </TouchableOpacity>

        {product.isForSwap && (
          <TouchableOpacity style={styles.swapBtn}>
            <Text style={styles.swapBtnText}>Swap</Text>
          </TouchableOpacity>
        )}
      </View>
      

{/* WhatsApp & Chat Icons */}
<View style={styles.iconsContainer}>
  <TouchableOpacity style={styles.iconBtn}>
    <MaterialCommunityIcons name="whatsapp" size={60} color="#25D366" marginLeft="100" />
  </TouchableOpacity>
  
  <TouchableOpacity style={styles.iconBtn}>
    <MaterialCommunityIcons name="chat" size={60} color="#4caf50" />
  </TouchableOpacity>
</View>

    </ScrollView>
    
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 20   ,paddingTop: 50},
  image: {
    width,
    height: 300,
    resizeMode: "cover",
  },
  noImage: {
    width,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  details: { padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  price: { fontSize: 20, fontWeight: "bold", color: "#ff6f61", marginBottom: 6 },
  condition: { fontSize: 14, color: "#666", marginBottom: 10 },
  description: { fontSize: 14, color: "#444", lineHeight: 20, marginBottom: 10 },
  field: { fontSize: 14, color: "#333", marginBottom: 6 },

  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 10,
  },
  buyBtn: {
    backgroundColor: "#ff6f61",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  buyBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  swapBtn: {
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginLeft: 10,
  },
  swapBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconsContainer: {
  flexDirection: "row",
  justifyContent: "flex-start",
  marginHorizontal: 16,
  marginTop: 15,
},
iconBtn: {
  backgroundColor: "#eee",
  padding: 12,
  borderRadius: 50,
  marginRight: 15,
  alignItems: "center",
  justifyContent: "center",
},

});
