// frontend/src/components/ProductOwnerBuyerRequest.jsx
import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { API_URL } from "../../constants/config";

const theme = {
  primary: "#2F6F61",
  accent: "#FF6F61",
  danger: "#D32F2F",
  border: "#E5E7EB",
  muted: "#6C757D",
};

export default function ProductOwnerBuyerRequest({ requests, user, onRefresh }) {
  const navigation = useNavigation();

  const getAuthHeaders = async () => {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const cancelBuy = async (req) => {
    try {
      const headers = await getAuthHeaders();
      await axios.patch(
        `${API_URL}/api/products/${req.product._id}/buy/${req._id}/cancel`,
        {},
        { headers }
      );
      onRefresh();
    } catch (err) {
      console.log("Cancel buy error:", err.response?.data || err.message);
    }
  };

  const respondBuy = async (req, action) => {
    try {
      const headers = await getAuthHeaders();
      await axios.patch(
        `${API_URL}/api/products/${req.product._id}/buy/${req._id}/respond`,
        { status: action },
        { headers }
      );
      onRefresh();
    } catch (err) {
      console.log("Respond buy error:", err.response?.data || err.message);
    }
  };

  // Current user’s identifiers
  const currentUserDbId = user.dbId; // From backend (Mongo _id)
  const currentUserUid = user.uid;   // Firebase UID

  // Filter requests
  const sentRequests = requests.filter(
    r => r.buyerId === currentUserDbId || r.buyerId === currentUserUid
  );

  const receivedRequests = requests.filter(
    r => r.sellerId === currentUserDbId || r.sellerId === currentUserUid
  );

  // Render card for each request
  const renderRequestCard = (req, type) => (
    <View key={req._id} style={styles.card}>
      <Text style={styles.subTitle}>
        {type === "sent" ? "You Sent a Buy Request" : "Buy Request Received"}
      </Text>

      <TouchableOpacity
        onPress={() => navigation.navigate("ProductDetails", { product: req.product })}
      >
        {req.product.imagesUrls?.[0] ? (
          <Image source={{ uri: req.product.imagesUrls[0] }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: theme.border }]} />
        )}
        <Text style={styles.productTitle}>{req.product.title}</Text>
      </TouchableOpacity>

      {/* ✅ Show seller and buyer info */}
      <Text style={styles.infoText}>
        Seller: {req.sellerName} ({req.sellerContact})
      </Text>
      <Text style={styles.infoText}>
        Buyer: {req.buyerName} ({req.buyerContact})
      </Text>

      <Text style={styles.statusText}>Status: {req.status}</Text>

      {/* Cancel button for sent requests */}
      {type === "sent" && req.status === "pending" && (
        <TouchableOpacity
          style={[styles.ownerBadge, { backgroundColor: theme.danger }]}
          onPress={() => cancelBuy(req)}
        >
          <Text style={styles.ownerBadgeText}>Cancel Request</Text>
        </TouchableOpacity>
      )}

      {/* Accept/Reject buttons for received requests */}
      {type === "received" && req.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => respondBuy(req, "accepted")}
          >
            <Text style={styles.ownerBadgeText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => respondBuy(req, "rejected")}
          >
            <Text style={styles.ownerBadgeText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ marginHorizontal: 16 }}>
      {/* Sent Requests */}
      <Text style={styles.sectionTitle}>Buy Requests You Sent</Text>
      {sentRequests.length === 0 ? (
        <Text style={styles.emptyText}>No buy requests sent</Text>
      ) : (
        sentRequests.map(req => renderRequestCard(req, "sent"))
      )}

      {/* Received Requests */}
      <Text style={styles.sectionTitle}>Buy Requests Received</Text>
      {receivedRequests.length === 0 ? (
        <Text style={styles.emptyText}>No buy requests received</Text>
      ) : (
        receivedRequests.map(req => renderRequestCard(req, "received"))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#2F6F61",
  },
  emptyText: {
    textAlign: "center",
    color: theme.muted,
    marginBottom: 12,
    fontSize: 14,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    padding: 12,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    marginBottom: 10,
  },
  productTitle: {
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 6,
  },
  subTitle: { fontWeight: "600", marginBottom: 4 },
  infoText: { fontSize: 13, color: "#333", marginTop: 2 },
  statusText: { marginTop: 6, fontSize: 12, color: theme.muted },
  ownerBadge: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  ownerBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  actions: { flexDirection: "row", marginTop: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    marginRight: 8,
  },
  acceptBtn: { backgroundColor: theme.primary },
  rejectBtn: { backgroundColor: theme.danger },
});
