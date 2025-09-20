// frontend/src/screens/Home/MyActivityScreen.jsx
import React, { useState, useCallback, useEffect } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
import Layout from "../../components/Layouts";

export default function MyActivityScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [myProducts, setMyProducts] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch ONLY my products
  const fetchMyProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products`);
      const filtered = (res.data || []).filter(
        (p) => p.ownerId?.firebaseUid === user?.uid
      );
      setMyProducts(filtered);
    } catch (err) {
      console.log("Error fetching my products:", err.response?.data || err.message);
      setMyProducts([]);
    }
  };

  // Fetch swap requests
  const fetchSwapRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products`);
      const allProducts = res.data || [];

      const requests = [];

      allProducts.forEach((product) => {
        if (!product.swapRequests) return;

        product.swapRequests.forEach((req) => {
          if (req.buyerId === user.uid || product.ownerId?.firebaseUid === user.uid) {
            const buyerProduct = allProducts.find(p => p._id === req.buyerProductId);

            requests.push({
              ...req,
              sellerProductId: product._id,
              sellerProductTitle: product.title,
              sellerProductImageUrl: product.imagesUrls?.[0] || null,
              sellerProductPrice: product.price,
              sellerProductCondition: product.condition,
              buyerProductId: buyerProduct?._id,
              buyerProductTitle: buyerProduct?.title || "Your Product",
              buyerProductImageUrl: buyerProduct?.imagesUrls?.[0] || null,
              buyerProductPrice: buyerProduct?.price || 0,
              buyerProductCondition: buyerProduct?.condition || "N/A",
              sellerId: product.ownerId?.firebaseUid,
              buyerName: req.buyerName || "Buyer",
              status: req.status || "pending",
            });
          }
        });
      });

      // Show all pending, accepted, or rejected swaps for buyers, and all swaps for sellers
      const filteredRequests = requests.filter(r =>
        r.buyerId === user.uid
          ? ["pending", "accepted", "rejected"].includes(r.status)
          : true
      );

      setSwapRequests(filteredRequests);
    } catch (err) {
      console.log("Error fetching swaps:", err.response?.data || err.message);
      setSwapRequests([]);
    }
  };

  useEffect(() => {
    onRefresh();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchMyProducts(), fetchSwapRequests()]).finally(() =>
      setRefreshing(false)
    );
  }, []);

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Cancel swap (buyer)
  const cancelSwap = async (req) => {
    try {
      await axios.patch(
        `${API_URL}/api/products/${req.sellerProductId}/swap/${req._id}/cancel`,
        { userId: user.uid }
      );
      fetchSwapRequests();
    } catch (err) {
      console.log("Cancel swap error:", err);
    }
  };

  // Respond swap (seller)
  const respondSwap = async (req, action) => {
    try {
      await axios.patch(
        `${API_URL}/api/products/${req.sellerProductId}/swap/${req._id}/respond`,
        { status: action, userId: user.uid }
      );

      setSwapRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: action } : r))
      );

      if (action === "accepted") {
        setMyProducts((prev) =>
          prev.map((p) =>
            p._id === req.sellerProductId ? { ...p, status: "swapped" } : p
          )
        );
      }
    } catch (err) {
      console.log("Respond swap error:", err.response?.data || err.message);
    }
  };

  return (
    <Layout>
      {/* Add Product */}
      <TouchableOpacity
        style={styles.addProductBtn}
        onPress={() => navigation.navigate("AddProduct")}
      >
        <Text style={styles.addProductText}>+ Add Product</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* My Products */}
        <Text style={styles.sectionTitle}>My Products</Text>
        <View style={styles.itemsContainer}>
          {myProducts.length === 0 && (
            <Text style={styles.emptyText}>You haven’t listed any products yet</Text>
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
                <Image source={{ uri: item.imagesUrls[0] }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, { backgroundColor: "#ccc" }]} />
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardPrice}>LKR. {formatPrice(item.price)}</Text>
                <Text style={styles.cardCondition}>Condition: {item.condition}</Text>
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Your Product</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Swap Requests */}
        <Text style={styles.sectionTitle}>Swap Requests</Text>
        <View style={styles.itemsContainer}>
          {swapRequests.length === 0 && (
            <Text style={styles.emptyText}>No swap requests yet</Text>
          )}

          {swapRequests.map((req) => (
            <View key={req._id} style={styles.card}>
              {req.buyerId === user.uid ? (
                // Buyer view
                <>
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Seller’s Product:</Text>
                  {req.sellerProductImageUrl ? (
                    <Image source={{ uri: req.sellerProductImageUrl }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, { backgroundColor: "#ccc" }]} />
                  )}
                  <Text>{req.sellerProductTitle}</Text>

                  <Text style={{ fontWeight: "bold", marginTop: 6 }}>Your Offered Product:</Text>
                  {req.buyerProductImageUrl ? (
                    <Image source={{ uri: req.buyerProductImageUrl }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, { backgroundColor: "#ccc" }]} />
                  )}
                  <Text>{req.buyerProductTitle}</Text>

                  <Text style={{ marginTop: 6, fontSize: 12, color: "#777" }}>Status: {req.status}</Text>

                  {req.status === "pending" && (
                    <TouchableOpacity
                      style={[styles.ownerBadge, { backgroundColor: "#ff4d4f" }]}
                      onPress={() => cancelSwap(req)}
                    >
                      <Text style={styles.ownerBadgeText}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                // Seller view
                <>
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Your Product:</Text>
                  {req.sellerProductImageUrl ? (
                    <Image source={{ uri: req.sellerProductImageUrl }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, { backgroundColor: "#ccc" }]} />
                  )}
                  <Text>{req.sellerProductTitle}</Text>

                  <Text style={{ fontWeight: "bold", marginTop: 6 }}>Buyer’s Offered Product:</Text>
                  {req.buyerProductImageUrl ? (
                    <Image source={{ uri: req.buyerProductImageUrl }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, { backgroundColor: "#ccc" }]} />
                  )}
                  <Text>{req.buyerProductTitle}</Text>

                  <Text style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
                    {req.buyerName} wants to swap
                  </Text>
                  <Text style={{ fontSize: 12, color: "#777" }}>Status: {req.status}</Text>

                  {req.status === "pending" && req.sellerId === user.uid && (
                    <View style={styles.swapActions}>
                      <TouchableOpacity
                        style={[styles.swapActionBtn, styles.swapAcceptBtn]}
                        onPress={() => respondSwap(req, "accepted")}
                      >
                        <Text style={styles.ownerBadgeText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.swapActionBtn, styles.swapRejectBtn]}
                        onPress={() => respondSwap(req, "rejected")}
                      >
                        <Text style={styles.ownerBadgeText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </Layout>
  );
}
// Styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  addProductBtn: {
    backgroundColor: "#2f95dc",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  addProductText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 12,
    color: "#ff6f61",
  },
  itemsContainer: {
    flexDirection: "column",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    width: "100%",
    marginBottom: 12,
    fontSize: 14,
    fontStyle: "italic",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    padding: 12,
  },
  cardImage: { width: "100%", height: 140, borderRadius: 8, marginBottom: 10, resizeMode: "cover" },
  cardInfo: { paddingHorizontal: 0, paddingVertical: 0 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4, color: "#333" },
  cardPrice: { fontSize: 14, color: "#ff6f61", fontWeight: "bold", marginBottom: 2 },
  cardCondition: { fontSize: 12, color: "#555", marginBottom: 4 },
  ownerBadge: {
    marginTop: 8,
    backgroundColor: "#2f95dc",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    alignSelf: "flex-start",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  ownerBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  swapActions: { flexDirection: "row", justifyContent: "flex-start", marginTop: 8 },
  swapActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    marginRight: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  swapAcceptBtn: { backgroundColor: "green" },
  swapRejectBtn: { backgroundColor: "red" },
});
