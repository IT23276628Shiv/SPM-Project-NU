import React from 'react';
import colors from '../../constants/colors';
import authfirebase from '../../../services/firebaseAuth';

import {View,ScrollView,TextInput,StyleSheet,Dimensions,Text,TouchableOpacity,Image} from "react-native";

import Layout from "../../components/Layouts"; 

const { width } = Dimensions.get("window");

const categories = [
  "Clothing",
  "Electronics",
  "Furniture",
  "Books",
  "Toys",
  "Accessories",
];

const items = [
  {
    id: 1,
    title: "Vintage Leather Jacket",
    price: "$45",
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 2,
    title: "Wooden Chair",
    price: "$30",
    image:
      "https://images.unsplash.com/photo-1505692794403-33a4d10be9e4?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 3,
    title: "Smartphone - Good Condition",
    price: "$120",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 4,
    title: "Classic Novel Set",
    price: "$25",
    image:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80",
  },
];

export default function HomeScreen() {
  return (
    <Layout>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search secondhand goods..."
          style={styles.searchInput}
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          {categories.map((cat, index) => (
            <TouchableOpacity key={index} style={styles.categoryBtn}>
              <Text style={styles.categoryText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Items */}
        <Text style={styles.sectionTitle}>Featured Items</Text>
        <View style={styles.itemsContainer}>
          {items.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardPrice}>{item.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 20,
  },
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
  categoryBtn: {
    backgroundColor: '#2f95dc', // orange
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginRight: 12,
  },
  categoryText: {
    color: "#fff",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#ff6f61", // changed from '#2f95dc' to orange
  },
  itemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: (width - 60) / 2,
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
  cardImage: {
    width: "100%",
    height: 140,
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  cardPrice: {
    fontSize: 14,
    color: "#ff6f61", // orange
    fontWeight: "bold",
  },
});
