import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import axios from "axios";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
import Layout from "../../components/Layouts";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState([]);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/categories`);
      setCategories(res.data || []);
    } catch (e) {
      console.log("Error fetching categories:", e.response?.data || e.message);
      setCategories([]);
    }
  };

  // Fetch products
  const fetchProducts = async (categoryId = "") => {
    try {
      const url = categoryId
        ? `${API_URL}/api/products?categoryId=${categoryId}`
        : `${API_URL}/api/products`;

      const res = await axios.get(url);
      setProducts(res.data || []);
    } catch (e) {
      console.log("Error fetching products:", e.response?.data || e.message);
      setProducts([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchProducts();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(selectedCategory).finally(() => setRefreshing(false));
  }, [selectedCategory]);

  const filteredProducts = products.filter((p) =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Add to cart
  const handleAddToCart = async (product) => {
    try {
      const key = `cart_${user._id}`;
      const storedCart = await AsyncStorage.getItem(key);
      const cartItems = storedCart ? JSON.parse(storedCart) : [];

      if (cartItems.some((item) => item._id === product._id)) {
        Alert.alert("Info", "Product already in cart");
        return;
      }

      const updatedCart = [...cartItems, product];
      await AsyncStorage.setItem(key, JSON.stringify(updatedCart));

      Alert.alert("Success", `${product.title} added to cart`);
    } catch (err) {
      console.log("Error saving cart:", err);
    }
  };

  return (
    <Layout>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search secondhand goods..."
          style={styles.searchInput}
          placeholderTextColor="#777"
          value={search}
          onChangeText={(text) => setSearch(text)}
        />
      </View>

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
        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          <TouchableOpacity
            style={[
              styles.categoryBtn,
              selectedCategory === "" && styles.selectedCategory,
            ]}
            onPress={() => {
              setSelectedCategory("");
              fetchProducts();
            }}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === "" && styles.selectedCategoryText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {categories?.map((cat) => (
            <TouchableOpacity
              key={cat._id}
              style={[
                styles.categoryBtn,
                selectedCategory === cat._id && styles.selectedCategory,
              ]}
              onPress={() => {
                setSelectedCategory(cat._id);
                fetchProducts(cat._id);
              }}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat._id && styles.selectedCategoryText,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products */}
        <Text style={styles.sectionTitle}>Products</Text>
        <View style={styles.itemsContainer}>
          {filteredProducts.length === 0 && (
            <Text style={{ textAlign: "center", color: "#777", width: "100%" }}>
              No products found
            </Text>
          )}

          {filteredProducts?.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.card}
              onPress={() => navigation.navigate("ProductDetails", { product: item })}
            >
              {item.imagesUrls?.[0] ? (
                <Image
                  source={{ uri: item.imagesUrls[0] }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={[styles.cardImage, { backgroundColor: "#DADADA" }]} />
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardPrice}>LKR {formatPrice(item.price)}</Text>
                <Text style={styles.cardCondition}>
                  Condition: {item.condition}
                </Text>

                {item.ownerId?.firebaseUid === user?.uid ? (
                  <View style={styles.ownerBadge}>
                    <Text style={styles.ownerBadgeText}>Your Product</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={() => handleAddToCart(item)}
                  >
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  searchContainer: { marginBottom: 10 },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#CED4DA",
  },
  addProductBtn: {
    backgroundColor: "#2F6F61", // Muted green (Floof style)
    padding: 12,
    borderRadius: 25,
    marginBottom: 20,
    alignItems: "center",
  },
  addProductText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  categoryBtn: {
    backgroundColor: "#E1EDE7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryText: { color: "#2F6F61", fontWeight: "500" },
  selectedCategory: { backgroundColor: "#2F6F61" },
  selectedCategoryText: { color: "#fff" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    color: "#2F2F2F",
  },
  itemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: -10,
  },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  cardImage: { width: "100%", height: 140, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardInfo: { padding: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#2F2F2F",
  },
  cardPrice: { fontSize: 14, color: "#2F6F61", fontWeight: "bold" },
  cardCondition: { fontSize: 12, color: "#6C757D", marginTop: 2 },
  addToCartBtn: {
    marginTop: 10,
    backgroundColor: "#2F6F61",
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  addToCartText: { color: "#fff", fontWeight: "600" },
  ownerBadge: {
    marginTop: 10,
    backgroundColor: "#ADB5BD",
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  ownerBadgeText: { color: "#fff", fontWeight: "600" },
});
