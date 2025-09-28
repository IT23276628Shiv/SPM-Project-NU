import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Image
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAdmin } from '../../context/AdminContext';
import { API_URL } from '../../constants/config';

export default function AdminProductsScreen({ navigation }) {
  const { admin } = useAdmin();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchProducts = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      const token = await admin.getIdToken();
      
      let url = `${API_URL}/api/admin/products?page=${pageNum}&limit=20`;
      if (filter !== 'all') url += `&status=${filter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        if (reset || pageNum === 1) {
          setProducts(data.products);
        } else {
          setProducts(prev => [...prev, ...data.products]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProductStatus = async (productId, status) => {
    try {
      const token = await admin.getIdToken();
      const response = await fetch(`${API_URL}/api/admin/products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setProducts(prev => prev.map(product => 
          product._id === productId ? { ...product, status } : product
        ));
        Alert.alert('Success', 'Product status updated');
      }
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  const deleteProduct = async (productId) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await admin.getIdToken();
              const response = await fetch(`${API_URL}/api/admin/products/${productId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                setProducts(prev => prev.filter(product => product._id !== productId));
                Alert.alert('Success', 'Product deleted');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchProducts(1, true);
  }, [filter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'sold': return '#2196F3';
      case 'swapped': return '#FF9800';
      case 'removed': return '#F44336';
      default: return '#666';
    }
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productItem}>
      <Image
        source={{ uri: item.imagesUrls?.[0] }}
        style={styles.productImage}
        defaultSource={require('../../../assets/welcome.png')}
      />
      
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.productPrice}>LKR {item.price?.toLocaleString()}</Text>
        <Text style={styles.productOwner}>By: {item.ownerId?.username || 'Unknown'}</Text>
        
        <View style={styles.productMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.productDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            const statuses = ['available', 'sold', 'swapped', 'removed'];
            Alert.alert(
              'Change Status',
              'Select new status:',
              statuses.map(status => ({
                text: status,
                onPress: () => updateProductStatus(item._id, status)
              }))
            );
          }}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#2F6F61" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ffebee' }]}
          onPress={() => deleteProduct(item._id)}
        >
          <MaterialCommunityIcons name="delete" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Management</Text>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        {['all', 'available', 'sold', 'swapped', 'removed'].map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filter === status && styles.activeFilter]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.activeFilterText]}>
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderProductItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              fetchProducts(1, true).finally(() => setRefreshing(false));
            }} 
          />
        }
        onEndReached={() => {
          if (!loading && hasMore) {
            fetchProducts(page + 1);
          }
        }}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant-closed" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
    </View>
  );
}
