import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

export default function AdminDashboardScreen() {
  const { user, userDetails } = useAuth();
  const navigation = useNavigation();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalComplaints: 0,
    totalFeedback: 0,
    recentUsers: 0,
    recentProducts: 0,
    pendingComplaints: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats().finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const renderStatCard = (title, value, icon, color, onPress) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]} 
      onPress={onPress}
    >
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={24} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  const renderQuickAction = (title, icon, color, onPress) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={32} color="#FFFFFF" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6F61" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>
            Welcome back, {userDetails?.username} ({userDetails?.role})
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.profileButton}
        >
          <MaterialCommunityIcons name="account-circle" size={32} color="#2F6F61" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsContainer}>
          {renderStatCard(
            'Total Users',
            stats.totalUsers,
            'account-group',
            '#2F6F61',
            () => navigation.navigate('Users')
          )}
          {renderStatCard(
            'Total Products',
            stats.totalProducts,
            'package-variant',
            '#FF6F61',
            () => navigation.navigate('Products')
          )}
        </View>

        <View style={styles.statsContainer}>
          {renderStatCard(
            'Complaints',
            stats.totalComplaints,
            'alert-circle',
            '#FF9500',
            () => navigation.navigate('Complaints')
          )}
          {renderStatCard(
            'Feedback',
            stats.totalFeedback,
            'message-text',
            '#4CAF50',
            () => navigation.navigate('AdminFeedback')
          )}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity (7 days)</Text>
        <View style={styles.activityContainer}>
          <View style={styles.activityItem}>
            <MaterialCommunityIcons name="account-plus" size={24} color="#2F6F61" />
            <Text style={styles.activityText}>
              {stats.recentUsers} new users registered
            </Text>
          </View>
          <View style={styles.activityItem}>
            <MaterialCommunityIcons name="package-variant-closed" size={24} color="#FF6F61" />
            <Text style={styles.activityText}>
              {stats.recentProducts} new products added
            </Text>
          </View>
          <View style={styles.activityItem}>
            <MaterialCommunityIcons name="alert" size={24} color="#FF9500" />
            <Text style={styles.activityText}>
              {stats.pendingComplaints} complaints need attention
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          {userDetails?.permissions?.includes('users_manage') &&
            renderQuickAction(
              'Manage Users',
              'account-group',
              '#2F6F61',
              () => navigation.navigate('Users')
            )}
          
          {userDetails?.permissions?.includes('products_manage') &&
            renderQuickAction(
              'Manage Products',
              'package-variant',
              '#FF6F61',
              () => navigation.navigate('Products')
            )}

          {userDetails?.permissions?.includes('complaints_manage') &&
            renderQuickAction(
              'Handle Complaints',
              'alert-circle',
              '#FF9500',
              () => navigation.navigate('Complaints')
            )}

          {userDetails?.permissions?.includes('feedback_view') &&
            renderQuickAction(
              'View Feedback',
              'message-text',
              '#4CAF50',
              () => navigation.navigate('AdminFeedback')
            )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  quickAction: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});