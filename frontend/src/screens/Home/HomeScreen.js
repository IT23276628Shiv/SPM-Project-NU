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
     // console.log("Fetching categories...");
      const res = await axios.get(`${API_URL}/api/categories`);
     // console.log("Fetched categories:", res.data);
      setCategories(res.data || []);
    } catch (e) {
      console.log("Error fetching categories:", e.response?.data || e.message);
      setCategories([]);
    }
  };

  // Fetch products (backend filtering by category)
  const fetchProducts = async (categoryId = "") => {
    try {
      const url = categoryId
        ? `${API_URL}/api/products?categoryId=${categoryId}`
        : `${API_URL}/api/products`;

     // console.log("Fetching products from:", url);
      const res = await axios.get(url);
      //console.log("Fetched products:", res.data);
      setProducts(res.data || []);
    } catch (e) {
      console.log("Error fetching products:", e.response?.data || e.message);
      setProducts([]);
    }
  };

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
     // console.log("Screen focused → fetching categories & products");
      fetchCategories();
      fetchProducts();
    }, [])
  );

  const onRefresh = useCallback(() => {
   // console.log("Refreshing products for category:", selectedCategory);
    setRefreshing(true);
    fetchProducts(selectedCategory).finally(() => setRefreshing(false));
  }, [selectedCategory]);

  // Filter products by search only (category already handled by backend)
  const filteredProducts = products.filter((p) =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  // Format price with commas
  const formatPrice = (price) => {
    if (!price) return "N/A";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };


  // Add to cart
const handleAddToCart = async (product) => {
  try {
    const key = `cart_${user._id}`;  // make it user-specific
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
          placeholderTextColor="#999"
          value={search}
          onChangeText={(text) => {
          //  console.log("Search input:", text);
            setSearch(text);
          }}
        />
      </View>

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
            //  console.log("Selected category: All");
              setSelectedCategory("");
              fetchProducts(); // Fetch all products
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
              //  console.log("Selected category:", cat);
                setSelectedCategory(cat._id);
                fetchProducts(cat._id); // Fetch products by category
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
              onPress={() => {
              //  console.log("Navigating to ProductDetails with:", item);
                navigation.navigate("ProductDetails", { product: item });
              }}
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

                {/* Add to Cart */}
                {/* Add to Cart OR Owner Label */}
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
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addProductBtn: {
    backgroundColor: "#2f95dc",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  addProductText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  categoryBtn: {
    backgroundColor: "#2f95dc",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginRight: 12,
  },
  categoryText: { color: "#fff", fontWeight: "600" },
  selectedCategory: { backgroundColor: "#ff6f61" },
  selectedCategoryText: { color: "#fff", fontWeight: "bold" },
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
  addToCartBtn: {
    marginTop: 10,
    backgroundColor: "#ff6f61",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  addToCartText: { color: "#fff", fontWeight: "bold" },

  ownerBadge: {
  marginTop: 10,
  backgroundColor: "#2f95dc",
  paddingVertical: 8,
  borderRadius: 8,
  alignItems: "center",
},
ownerBadgeText: { color: "#fff", fontWeight: "bold" },

});

