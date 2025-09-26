import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";


export default function CartScreen() {
  const [cart, setCart] = useState([]);
  const navigation = useNavigation();
  const { user } = useAuth();


useEffect(() => {
  const loadCart = async () => {
    const key = `cart_${user._id}`;
    const storedCart = await AsyncStorage.getItem(key);
    setCart(storedCart ? JSON.parse(storedCart) : []);
  };
  loadCart();
}, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Cart</Text>
      {cart.length === 0 ? (
        <Text>No items in cart</Text>
      ) : (
        <FlatList
          data={cart}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("ProductDetails", { product: item })}
            >
              <Image
                source={{ uri: item.imagesUrls?.[0] }}
                style={styles.image}
              />
              <View style={styles.info}>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.price}>LKR {item.price}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, marginTop: 40 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  card: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  image: { width: 80, height: 80, borderRadius: 10, marginRight: 10 },
  info: { justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "600" },
  price: { fontSize: 14, color: "#ff6f61" },
});
