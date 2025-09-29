// frontend/src/screens/Admin/AdminUsersScreen.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  RefreshControl
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext'; // FIXED
import { API_URL } from '../../constants/config';

export default function AdminUsersScreen({ navigation }) {
  const { user } = useAuth(); // FIXED: was useAdmin()
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchUsers = async (pageNum = 1, searchTerm = '', reset = false) => {
    try {
      setLoading(true);
      const token = await user.getIdToken(); // FIXED: was admin.getIdToken()
      
      let url = `${API_URL}/api/admin/users?page=${pageNum}&limit=20`;
      if (searchTerm) url += `&search=${searchTerm}`;
      if (filter !== 'all') url += `&status=${filter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        if (reset || pageNum === 1) {
          setUsers(data.users);
        } else {
          setUsers(prev => [...prev, ...data.users]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, isVerified) => {
    try {
      const token = await user.getIdToken(); // FIXED: was admin.getIdToken()
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isVerified })
      });

      const data = await response.json();
      if (response.ok) {
        setUsers(prev => prev.map(u => 
          u._id === userId ? { ...u, isVerified } : u
        ));
        Alert.alert('Success', 'User status updated');
      } else {
        Alert.alert('Error', data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(1, search, true).finally(() => setRefreshing(false));
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchUsers(page + 1, search);
    }
  };

  useEffect(() => {
    fetchUsers(1, search, true);
  }, [filter]);

  const handleSearch = () => {
    fetchUsers(1, search, true);
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.username}</Text>
          <View style={styles.userStatus}>
            <MaterialCommunityIcons 
              name={item.isVerified ? "check-circle" : "alert-circle"} 
              size={16} 
              color={item.isVerified ? "#4CAF50" : "#FF9500"} 
            />
            <Text style={[
              styles.statusText,
              { color: item.isVerified ? "#4CAF50" : "#FF9500" }
            ]}>
              {item.isVerified ? "Verified" : "Unverified"}
            </Text>
          </View>
        </View>
        
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userMeta}>
          Joined: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.userMeta}>
          Products: {item.favoriteProducts?.length || 0} favorites
        </Text>
      </View>

      <View style={styles.userActions}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Verified</Text>
          <Switch
            value={item.isVerified}
            onValueChange={(value) => updateUserStatus(item._id, value)}
            trackColor={{ false: "#e0e0e0", true: "#4CAF50" }}
            thumbColor={item.isVerified ? "#fff" : "#f4f3f4"}
          />
        </View>
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
        <Text style={styles.headerTitle}>User Management</Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'verified' && styles.activeFilter]}
            onPress={() => setFilter('verified')}
          >
            <Text style={[styles.filterText, filter === 'verified' && styles.activeFilterText]}>
              Verified
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unverified' && styles.activeFilter]}
            onPress={() => setFilter('unverified')}
          >
            <Text style={[styles.filterText, filter === 'unverified' && styles.activeFilterText]}>
              Unverified
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUserItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    </View>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#2F6F61',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  userItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  userActions: {
    marginLeft: 16,
  },
  switchContainer: {
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});