import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import colors from '../../constants/colors';

const MOCK_PRODUCTS = [
  { id: '1', title: 'iPhone 12 - Good Condition', price: 'LKR 165,000' },
  { id: '2', title: 'Honda Dio 2018', price: 'LKR 360,000' },
];

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OLX Listings</Text>
      <FlatList
        data={MOCK_PRODUCTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => {}}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.price}>{item.price}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: 'white' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  price: { marginTop: 6, color: colors.primary, fontWeight: '700' },
});
