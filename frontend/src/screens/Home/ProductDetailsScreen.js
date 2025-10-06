// frontend/src/screens/Home/ProductDetailsScreen.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";

const { width } = Dimensions.get("window");

// Theme colors
const theme = {
  primary: "#2F6F61",   // muted green
  accent: "#FF6F61",    // coral
  danger: "#D32F2F",    // red
  background: "#FFFFFF",
  muted: "#6C757D",
  border: "#E0E6E3",
};

export default function ProductDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [product, setProduct] = React.useState(route.params?.product || {});
  const [loading, setLoading] = React.useState(true);

  // Fetch fresh product data on mount
  React.useEffect(() => {
     if (!product?._id) return;
    const fetchProduct = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/products/${product._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [product._id, user]);

  // Derived state: check if user already requested to buy
  const hasRequested = React.useMemo(() => {
    return product.buyRequests?.some(
      r => (r.buyerId === user?.uid || r.buyerId?._id === user?.uid) && r.status === "pending"
    );
  }, [product.buyRequests, user?.uid]);

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return Number(price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleStartChat = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/messages/conversations/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: product.ownerId._id,
          productId: product._id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigation.navigate("Chat", {
          conversation: data.conversation,
          otherUser: data.conversation.otherUser,
        });
      } else {
        Alert.alert("Error", data.error || "Failed to start conversation");
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("Error", "Failed to start conversation");
    }
  };

  const handleWhatsApp = () => {
    if (product.ownerContact) {
      const message = `Hi! I'm interested in your product: ${product.title} - LKR ${formatPrice(
        product.price
      )}`;
      const whatsappUrl = `whatsapp://send?phone=${product.ownerContact}&text=${encodeURIComponent(
        message
      )}`;

      Linking.canOpenURL(whatsappUrl).then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Alert.alert("WhatsApp not installed", "Please install WhatsApp to use this feature");
        }
      });
    } else {
      Alert.alert("Contact not available", "Seller contact information is not available");
    }
  };

const handleBuy = async () => {
  try {
    const token = await user.getIdToken();
    const response = await fetch(`${API_URL}/api/products/${product._id}/buy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      Alert.alert("Success", "Buy request sent successfully");

      // Use backend response for accurate buyerId
      const newRequest = data.product.buyRequests.at(-1);

      setProduct(prev => ({
        ...prev,
        buyRequests: [...(prev.buyRequests || []), newRequest]
      }));
    } else {
      Alert.alert("Error", data.error || "Failed to send buy request");
    }
  } catch (error) {
    console.error("Buy request error:", error);
    Alert.alert("Error", "Something went wrong");
  }
};



  const handleCall = () => {
    if (product.ownerContact) {
      const phoneUrl = `tel:${product.ownerContact}`;

      Linking.canOpenURL(phoneUrl).then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert("Cannot make call", "Your device does not support making calls");
        }
      });
    } else {
      Alert.alert("Contact not available", "Seller contact information is not available");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>No product found</Text>
      </View>
    );
  }

  const isOwner = product?.ownerId?.firebaseUid === user?.uid;
  const canEditOrBuySwap = product.status === "available";

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
            <Text style={{ color: theme.muted }}>No Images Available</Text>
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

        {product.ownerName && <Text style={styles.field}>Owner: {product.ownerName}</Text>}
        {product.ownerContact && <Text style={styles.field}>Contact No: {product.ownerContact}</Text>}
        {product.categoryName && <Text style={styles.field}>Category: {product.categoryName}</Text>}

        <Text style={styles.field}>Status: {product.status}</Text>
        <Text style={styles.field}>Views: {product.viewsCount}</Text>
        <Text style={styles.field}>
          Listed On: {new Date(product.listedDate).toDateString()}
        </Text>

        {product.isForSwap && <Text style={styles.field}>Available for Swap ✅</Text>}
        {product.swapPreferences && (
          <Text style={styles.field}>Swap Preferences: {product.swapPreferences}</Text>
        )}
        {product.address && <Text style={styles.field}>Location: {product.address}</Text>}
      </View>

      {canEditOrBuySwap && !isOwner && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.buyBtn, hasRequested && { backgroundColor: theme.muted }]}
            onPress={!hasRequested ? handleBuy : null}
            disabled={hasRequested}
          >
            <Text style={styles.buyBtnText}>
              {hasRequested ? "Buy Request Sent" : "Buy Now"}
            </Text>
          </TouchableOpacity>

          {product.isForSwap && (
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={() => navigation.navigate("Swap", { product })}
            >
              <Text style={styles.swapBtnText}>Swap</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isOwner && (
        <View style={styles.communicationContainer}>
          <Text style={styles.communicationTitle}>Contact Seller</Text>
          <View style={styles.iconsContainer}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleStartChat}>
              <MaterialCommunityIcons name="chat" size={24} color={theme.primary} />
              <Text style={styles.iconLabel}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={handleWhatsApp}>
              <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
              <Text style={styles.iconLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={24} color={theme.accent} />
              <Text style={styles.iconLabel}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isOwner && canEditOrBuySwap && (
        <View style={styles.ownerSection}>
          <View style={styles.ownerBadge}>
            <MaterialCommunityIcons name="account-check" size={20} color="#fff" />
            <Text style={styles.ownerBadgeText}>This is your product</Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => Alert.alert("Edit Product", "Edit functionality can be implemented here")}
          >
            <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
            <Text style={styles.editButtonText}>Edit Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert("Delete Product", "Are you sure you want to delete this product?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const token = await user.getIdToken();
                      const response = await fetch(`${API_URL}/api/products/${product._id}`, {
                        method: "DELETE",
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      });

                      if (response.ok) {
                        Alert.alert("Deleted", "Product deleted successfully");
                        navigation.goBack();
                      } else {
                        const data = await response.json();
                        Alert.alert("Error", data.error || "Failed to delete product");
                      }
                    } catch (err) {
                      console.error("Delete error:", err);
                      Alert.alert("Error", "Something went wrong");
                    }
                  },
                },
              ]);
            }}
          >
            <MaterialCommunityIcons name="delete" size={18} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete Product</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    paddingTop: 50,
    backgroundColor: theme.background,
  },
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
    backgroundColor: theme.border,
  },
  details: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    color: "#2F2F2F",
  },
  price: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.accent,
    marginBottom: 6,
  },
  condition: {
    fontSize: 14,
    color: theme.muted,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 10,
  },
  field: {
    fontSize: 14,
    color: "#333",
    marginBottom: 6,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 10,
  },
  buyBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    elevation: 2,
  },
  buyBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  swapBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    flex: 1,
    marginLeft: 8,
    elevation: 2,
  },
  swapBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  communicationContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 2,
    shadowOpacity: 0.05,
  },
  communicationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2F2F2F",
    marginBottom: 12,
    textAlign: "center",
  },
  iconsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 50,
    backgroundColor: theme.background,
    elevation: 1,
    minWidth: 80,
  },
  iconLabel: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 6,
    fontWeight: "500",
  },
  ownerSection: {
    margin: 16,
    alignItems: "center",
  },
  ownerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 12,
  },
  ownerBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.danger,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
