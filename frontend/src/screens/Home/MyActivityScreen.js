// frontend/src/screens/Home/MyActivityScreen.jsx
import React, { useState, useCallback, useEffect, useRef } from "react";
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
import ProductOwnerBuyerRequest from "./ProductOwnerBuyerRequest";


// Theme colors
const theme = {
  primary: "#2F6F61",   // muted green
  accent: "#FF6F61",    // coral
  danger: "#D32F2F",    // red
  background: "#F9FAFB",
  card: "#FFFFFF",
  muted: "#6C757D",
  border: "#E5E7EB",
};

export default function MyActivityScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [myProducts, setMyProducts] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [buyRequests, setBuyRequests] = useState([]);


  const sectionPositions = useRef({});
  const scrollRef = useRef(null);

  const availableCount = myProducts.filter((p) => p.status === "available").length;
  const soldCount = myProducts.filter((p) => p.status === "sold").length;
  const swappedCount = myProducts.filter((p) => p.status === "swapped").length;
  const pendingRequestsCount = swapRequests.filter((r) => r.status === "pending").length;
  const buyRequestsCount = buyRequests.length;


  const scrollToSection = (key) => {
    if (scrollRef.current && sectionPositions.current[key] !== undefined) {
      scrollRef.current.scrollTo({
        y: sectionPositions.current[key],
        animated: true,
      });
    }
  };

  const handleLayout = (key, event) => {
    sectionPositions.current[key] = event.nativeEvent.layout.y;
  };

  const fetchMyProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products?all=true`);
      const filtered = (res.data || []).filter(
        (p) => p.ownerId?.firebaseUid === user?.uid
      );
      setMyProducts(filtered);
    } catch (err) {
      console.log("Error fetching my products:", err.response?.data || err.message);
      setMyProducts([]);
    }
  };

  const fetchSwapRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products?all=true`);
      const allProducts = res.data || [];
      const requests = [];

      allProducts.forEach((product) => {
        if (!product.swapRequests) return;

        product.swapRequests.forEach((req) => {
          if (req.buyerId === user.uid || product.ownerId?.firebaseUid === user.uid) {
            const buyerProduct = allProducts.find((p) => p._id === req.buyerProductId);

            requests.push({
              ...req,
              sellerProduct: product,
              buyerProduct: buyerProduct || { _id: req.buyerProductId, title: "Your Product", imagesUrls: [], price: 0, condition: "N/A" },
              sellerId: product.ownerId?.firebaseUid,
            });
          }
        });
      });

      const statusOrder = { pending: 1, accepted: 2, rejected: 3, cancelled: 4 };
      requests.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

      setSwapRequests(requests);
    } catch (err) {
      console.log("Error fetching swaps:", err.response?.data || err.message);
      setSwapRequests([]);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchMyProducts(), fetchSwapRequests(), fetchBuyRequests()])
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    onRefresh();
  }, []);


  useEffect(() => {
    onRefresh();
  }, []);

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const cancelSwap = async (req) => {
    try {
      await axios.patch(
        `${API_URL}/api/products/${req.sellerProduct._id}/swap/${req._id}/cancel`,
        { userId: user.uid }
      );
      fetchSwapRequests();
    } catch (err) {
      console.log("Cancel swap error:", err);
    }
  };

  const respondSwap = async (req, action) => {
    try {
      await axios.patch(
        `${API_URL}/api/products/${req.sellerProduct._id}/swap/${req._id}/respond`,
        { status: action, userId: user.uid }
      );

      setSwapRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: action } : r))
      );

      if (action === "accepted") {
        setMyProducts((prev) =>
          prev.map((p) =>
            p._id === req.sellerProduct._id ? { ...p, status: "swapped" } : p
          )
        );
      }
    } catch (err) {
      console.log("Respond swap error:", err.response?.data || err.message);
    }
  };

  const renderProductCard = (item) => (
    <TouchableOpacity
      key={item._id}
      style={styles.card}
      onPress={() => navigation.navigate("ProductDetails", { product: item })}
    >
      {item.imagesUrls?.[0] ? (
        <Image source={{ uri: item.imagesUrls[0] }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, { backgroundColor: theme.border }]} />
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardPrice}>LKR. {formatPrice(item.price)}</Text>
        <Text style={styles.cardCondition}>Condition: {item.condition}</Text>
        <View style={[styles.ownerBadge, 
          item.status === "available" && { backgroundColor: theme.primary },
          item.status === "sold" && { backgroundColor: theme.accent },
          item.status === "swapped" && { backgroundColor: "#6B7280" },
        ]}>
          <Text style={styles.ownerBadgeText}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

const fetchBuyRequests = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/products?all=true`);
    const allProducts = res.data || [];

    const requests = [];

    allProducts.forEach((product) => {
      if (!product.buyRequests?.length) return;

      const sellerId = String(product.ownerId?.firebaseUid || "").trim();

      product.buyRequests.forEach((req) => {
        // Keep buyerId as it is from DB
        const buyerId = req.buyerId ? String(req.buyerId).trim() : null;

        requests.push({
          _id: req._id,
          status: req.status,
          buyerId,
          sellerId,
          product,
        });
      });
    });

    // Sort pending first
    const statusOrder = { pending: 1, accepted: 2, rejected: 3, cancelled: 4 };
    requests.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

    // Filter requests relevant to current user:
    // - Either user is seller (Firebase UID)
    // - Or user is buyer (match with DB user ID from profile)
    // Assuming you have user.dbId stored in your AuthContext or user profile
    const currentUserDbId = user.dbId || user.uid; // fallback to uid if dbId unavailable
    const filtered = requests.filter(
      r => r.sellerId === String(user.uid).trim() || r.buyerId === String(currentUserDbId).trim()
    );

    // console.log("Filtered buy requests:", filtered.map(r => ({
    //   product: r.product.title,
    //   buyerId: r.buyerId,
    //   sellerId: r.sellerId,
    //   status: r.status,
    //   userUID: user.uid,
    //   userDbId: currentUserDbId,
    // })));

    setBuyRequests(filtered);

  } catch (err) {
    console.log("Error fetching buy requests:", err.response?.data || err.message);
    setBuyRequests([]);
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

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <TouchableOpacity style={styles.statBox} onPress={() => scrollToSection("available")}>
          <Text style={styles.statNumber}>{availableCount}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statBox} onPress={() => scrollToSection("sold")}>
          <Text style={styles.statNumber}>{soldCount}</Text>
          <Text style={styles.statLabel}>Sold</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statBox} onPress={() => scrollToSection("swapped")}>
          <Text style={styles.statNumber}>{swappedCount}</Text>
          <Text style={styles.statLabel}>Swapped</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statBox} onPress={() => scrollToSection("requests")}>
          <Text style={styles.statNumber}>{pendingRequestsCount}</Text>
          <Text style={styles.statLabel}>SwapReq</Text>
        </TouchableOpacity>

        {/* New Buy Requests Stat */}
        <TouchableOpacity style={styles.statBox} onPress={() => scrollToSection("buyRequests")}>
          <Text style={styles.statNumber}>{buyRequestsCount}</Text>
          <Text style={styles.statLabel}>BuyReq</Text>
        </TouchableOpacity>
      </View>


      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Available Products */}
        <View onLayout={(e) => handleLayout("available", e)}>
          <Text style={styles.sectionTitle}>Available Products</Text>
        </View>
        <View style={styles.itemsContainer}>
          {myProducts.filter((p) => p.status === "available").length === 0 && (
            <Text style={styles.emptyText}>No available products</Text>
          )}
          {myProducts.filter((p) => p.status === "available").map(renderProductCard)}
        </View>

        {/* Sold Products */}
        <View onLayout={(e) => handleLayout("sold", e)}>
          <Text style={styles.sectionTitle}>Sold Products</Text>
        </View>
        <View style={styles.itemsContainer}>
          {myProducts.filter((p) => p.status === "sold").length === 0 && (
            <Text style={styles.emptyText}>No sold products</Text>
          )}
          {myProducts.filter((p) => p.status === "sold").map(renderProductCard)}
        </View>

        {/* Swapped Products */}
        <View onLayout={(e) => handleLayout("swapped", e)}>
          <Text style={styles.sectionTitle}>Swapped Products</Text>
        </View>
        <View style={styles.itemsContainer}>
          {myProducts.filter((p) => p.status === "swapped").length === 0 && (
            <Text style={styles.emptyText}>No swapped products</Text>
          )}
          {myProducts.filter((p) => p.status === "swapped").map(renderProductCard)}
        </View>

        {/* Swap Requests */}
        <View onLayout={(e) => handleLayout("requests", e)}>
          <Text style={styles.sectionTitle}>Swap Requests</Text>
        </View>
        <View style={styles.itemsContainer}>
          {swapRequests.length === 0 && (
            <Text style={styles.emptyText}>No swap requests yet</Text>
          )}

          {swapRequests.map((req) => (
            <View key={req._id} style={styles.card}>
              {req.buyerId === user.uid ? (
                <>
                  {/* Buyer View */}
                  <Text style={styles.subTitle}>Seller’s Product:</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ProductDetails", { product: req.sellerProduct })}
                  >
                    {req.sellerProduct.imagesUrls?.[0] ? (
                      <Image source={{ uri: req.sellerProduct.imagesUrls[0] }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, { backgroundColor: theme.border }]} />
                    )}
                    <Text>{req.sellerProduct.title}</Text>
                  </TouchableOpacity>

                  <Text style={styles.subTitle}>Your Offered Product:</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ProductDetails", { product: req.buyerProduct })}
                  >
                    {req.buyerProduct.imagesUrls?.[0] ? (
                      <Image source={{ uri: req.buyerProduct.imagesUrls[0] }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, { backgroundColor: theme.border }]} />
                    )}
                    <Text>{req.buyerProduct.title}</Text>
                  </TouchableOpacity>

                  <Text style={styles.statusText}>Status: {req.status}</Text>
                  {req.status === "pending" && (
                    <TouchableOpacity
                      style={[styles.ownerBadge, { backgroundColor: theme.danger }]}
                      onPress={() => cancelSwap(req)}
                    >
                      <Text style={styles.ownerBadgeText}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  {/* Seller View */}
                  <Text style={styles.subTitle}>Your Product:</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ProductDetails", { product: req.sellerProduct })}
                  >
                    {req.sellerProduct.imagesUrls?.[0] ? (
                      <Image source={{ uri: req.sellerProduct.imagesUrls[0] }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, { backgroundColor: theme.border }]} />
                    )}
                    <Text>{req.sellerProduct.title}</Text>
                  </TouchableOpacity>

                  <Text style={styles.subTitle}>Buyer’s Offered Product:</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ProductDetails", { product: req.buyerProduct })}
                  >
                    {req.buyerProduct.imagesUrls?.[0] ? (
                      <Image source={{ uri: req.buyerProduct.imagesUrls[0] }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, { backgroundColor: theme.border }]} />
                    )}
                    <Text>{req.buyerProduct.title}</Text>
                  </TouchableOpacity>

                  <Text style={styles.smallNote}>{req.buyerName} wants to swap</Text>
                  <Text style={styles.statusText}>Status: {req.status}</Text>

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
        {/* Buy Requests */}
        <View onLayout={(e) => handleLayout("buyRequests", e)}>
          <Text style={styles.sectionTitle}>Buy Requests</Text>
        </View>
        <ProductOwnerBuyerRequest
          requests={buyRequests}
          user={user}
          onRefresh={onRefresh}
        />

      </ScrollView>
    </Layout>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  addProductBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    alignItems: "center",
    elevation: 2,
  },
  addProductText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 12,
    color: theme.accent,
  },
  itemsContainer: {
    flexDirection: "column",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: "center",
    color: theme.muted,
    width: "100%",
    marginBottom: 12,
    fontSize: 14,
    fontStyle: "italic",
  },
  card: {
    width: "100%",
    backgroundColor: theme.card,
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 2,
    padding: 12,
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: "cover",
  },
  cardInfo: { paddingHorizontal: 0, paddingVertical: 0 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#2F2F2F",
  },
  cardPrice: {
    fontSize: 14,
    color: theme.accent,
    fontWeight: "bold",
    marginBottom: 2,
  },
  cardCondition: { fontSize: 12, color: theme.muted, marginBottom: 4 },
  ownerBadge: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  ownerBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  swapActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 8,
  },
  swapActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    marginRight: 8,
  },
  swapAcceptBtn: { backgroundColor: theme.primary },
  swapRejectBtn: { backgroundColor: theme.danger },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 8,
    marginBottom: 20,
    backgroundColor: theme.card,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 4,
  },
  subTitle: { fontWeight: "600", marginTop: 6, marginBottom: 4, color: "#2F2F2F" },
  statusText: { marginTop: 6, fontSize: 12, color: theme.muted },
  smallNote: { fontSize: 12, color: theme.muted, marginTop: 6 },
});
