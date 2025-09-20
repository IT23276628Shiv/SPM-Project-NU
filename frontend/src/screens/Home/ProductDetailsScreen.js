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
  Alert
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";

const { width } = Dimensions.get("window");

export default function ProductDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { product } = route.params || {};
  const { user } = useAuth();

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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: product.ownerId._id,
          productId: product._id
        })
      });

      const data = await response.json();

      if (response.ok) {
        navigation.navigate('Chat', {
          conversation: data.conversation,
          otherUser: data.conversation.otherUser
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleWhatsApp = () => {
    if (product.ownerContact) {
      const message = `Hi! I'm interested in your product: ${product.title} - LKR ${formatPrice(product.price)}`;
      const whatsappUrl = `whatsapp://send?phone=${product.ownerContact}&text=${encodeURIComponent(message)}`;
      
      Linking.canOpenURL(whatsappUrl).then(supported => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this feature');
        }
      });
    } else {
      Alert.alert('Contact not available', 'Seller contact information is not available');
    }
  };

  const handleCall = () => {
    if (product.ownerContact) {
      const phoneUrl = `tel:${product.ownerContact}`;
      
      Linking.canOpenURL(phoneUrl).then(supported => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Cannot make call', 'Your device does not support making calls');
        }
      });
    } else {
      Alert.alert('Contact not available', 'Seller contact information is not available');
    }
  };

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>No product found</Text>
      </View>
    );
  }

  const isOwner = product?.ownerId?.firebaseUid === user?.uid;

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

      {!isOwner && (
        <>
          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.buyBtn}>
              <Text style={styles.buyBtnText}>Buy Now</Text>
            </TouchableOpacity>

            {product.isForSwap && (
              <TouchableOpacity 
                style={styles.swapBtn}
                onPress={() => navigation.navigate("Swap", { product })} // ✅ Pass product
              >
                <Text style={styles.swapBtnText}>Swap</Text>
              </TouchableOpacity>
            )}

          </View>

          {/* Communication Options */}
          <View style={styles.communicationContainer}>
            <Text style={styles.communicationTitle}>Contact Seller</Text>
            
            <View style={styles.iconsContainer}>
              {/* Chat Button */}
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={handleStartChat}
              >
                <MaterialCommunityIcons name="chat" size={24} color="#4caf50" />
                <Text style={styles.iconLabel}>Chat</Text>
              </TouchableOpacity>

              {/* WhatsApp Button */}
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={handleWhatsApp}
              >
                <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
                <Text style={styles.iconLabel}>WhatsApp</Text>
              </TouchableOpacity>

              {/* Call Button */}
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={handleCall}
              >
                <MaterialCommunityIcons name="phone" size={24} color="#2f95dc" />
                <Text style={styles.iconLabel}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Owner Badge for own products */}
      {isOwner && (
        <View style={styles.ownerSection}>
          <View style={styles.ownerBadge}>
            <MaterialCommunityIcons name="account-check" size={20} color="#fff" />
            <Text style={styles.ownerBadgeText}>This is your product</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              // Navigate to edit product screen (you can implement this)
              Alert.alert('Edit Product', 'Edit functionality can be implemented here');
            }}
          >
            <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
            <Text style={styles.editButtonText}>Edit Product</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    paddingBottom: 20,
    paddingTop: 50
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
    backgroundColor: "#eee",
  },
  details: { 
    padding: 16 
  },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    marginBottom: 8 
  },
  price: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#ff6f61", 
    marginBottom: 6 
  },
  condition: { 
    fontSize: 14, 
    color: "#666", 
    marginBottom: 10 
  },
  description: { 
    fontSize: 14, 
    color: "#444", 
    lineHeight: 20, 
    marginBottom: 10 
  },
  field: { 
    fontSize: 14, 
    color: "#333", 
    marginBottom: 6 
  },
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
    borderRadius: 25,
    alignItems: "center",
    flex: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buyBtnText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
  swapBtn: {
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    flex: 1,
    marginLeft: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  swapBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  communicationContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  communicationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  iconsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  iconLabel: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
    fontWeight: '500',
  },
  ownerSection: {
    margin: 16,
    alignItems: 'center',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2f95dc',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 12,
  },
  ownerBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6f61',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
});