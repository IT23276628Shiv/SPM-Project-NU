// frontend/src/screens/Seller/SellerDashboardScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
  Dimensions,
  FlatList
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';
import Layout from '../../components/Layouts';

const { width } = Dimensions.get('window');

export default function SellerDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [dashboardData, setDashboardData] = useState({
    notifications: [],
    stats: [],
    recentActivity: {
      newMessages: 0,
      newInquiries: 0,
      priceOffers: 0,
      productViews: 0,
      totalUnread: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(
        `${API_URL}/api/notifications/seller/dashboard?days=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        console.error('Error fetching dashboard data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, [selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [selectedPeriod])
  );

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'new_message': 'message-text',
      'new_inquiry': 'help-circle',
      'price_offer': 'currency-usd',
      'swap_request': 'swap-horizontal',
      'product_liked': 'heart',
      'product_viewed': 'eye',
      'call_missed': 'phone-missed'
    };
    return icons[type] || 'bell';
  };

  const getNotificationColor = (type) => {
    const colors = {
      'new_message': '#2f95dc',
      'new_inquiry': '#ff6f61',
      'price_offer': '#4caf50',
      'swap_request': '#ff9800',
      'product_liked': '#e91e63',
      'product_viewed': '#9c27b0',
      'call_missed': '#f44336'
    };
    return colors[type] || '#666';
  };

  const handleNotificationPress = async (notification) => {
    try {
      // Mark as read
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/notifications/mark-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notificationIds: [notification._id]
        })
      });

      // Navigate based on notification type
      if (notification.conversationId) {
        navigation.navigate('Chat', {
          conversation: { _id: notification.conversationId },
          otherUser: {
            _id: notification.senderId._id,
            username: notification.senderId.username,
            profilePictureUrl: notification.senderId.profilePictureUrl
          }
        });
      } else if (notification.productId) {
        navigation.navigate('ProductDetails', {
          product: notification.productId
        });
      }

      // Refresh data to update read status
      fetchDashboardData();
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/notifications/mark-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          markAll: true
        })
      });

      Alert.alert('Success', 'All notifications marked as read');
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const renderStatCard = (title, value, icon, color, onPress) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statIconContainer}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <MaterialCommunityIcons
          name={getNotificationIcon(item.type)}
          size={20}
          color={getNotificationColor(item.type)}
        />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.isRead && styles.unreadText]}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        {item.data?.productTitle && (
          <Text style={styles.notificationProduct}>
            Product: {item.data.productTitle}
          </Text>
        )}
      </View>
      
      {item.data?.productImage && (
        <Image
          source={{ uri: item.data.productImage }}
          style={styles.notificationProductImage}
        />
      )}
      
      {!item.isRead && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {[1, 7, 30].map(days => (
        <TouchableOpacity
          key={days}
          style={[
            styles.periodButton,
            selectedPeriod === days && styles.selectedPeriodButton
          ]}
          onPress={() => setSelectedPeriod(days)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === days && styles.selectedPeriodButtonText
          ]}>
            {days === 1 ? 'Today' : `${days} days`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Layout>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Seller Dashboard</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationSettings')}
            style={styles.settingsButton}
          >
            <MaterialCommunityIcons name="cog" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {renderStatCard(
              'New Messages',
              dashboardData.recentActivity.newMessages,
              'message-text',
              '#2f95dc',
              () => navigation.navigate('Messages')
            )}
            
            {renderStatCard(
              'New Inquiries',
              dashboardData.recentActivity.newInquiries,
              'help-circle',
              '#ff6f61',
              () => navigation.navigate('Messages')
            )}
          </View>

          <View style={styles.statsRow}>
            {renderStatCard(
              'Price Offers',
              dashboardData.recentActivity.priceOffers,
              'currency-usd',
              '#4caf50',
              () => navigation.navigate('Messages')
            )}
            
            {renderStatCard(
              'Product Views',
              dashboardData.recentActivity.productViews,
              'eye',
              '#9c27b0',
              () => {}
            )}
          </View>
        </View>

        {/* Unread Summary */}
        {dashboardData.recentActivity.totalUnread > 0 && (
          <View style={styles.unreadSummary}>
            <View style={styles.unreadSummaryContent}>
              <MaterialCommunityIcons name="bell-alert" size={24} color="#ff6f61" />
              <Text style={styles.unreadSummaryText}>
                You have {dashboardData.recentActivity.totalUnread} unread notifications
              </Text>
            </View>
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markAllReadButton}
            >
              <Text style={styles.markAllReadText}>Mark All Read</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={() => navigation.navigate('Messages')}
            >
              <MaterialCommunityIcons name="chat" size={24} color="#2f95dc" />
              <Text style={[styles.actionButtonText, styles.secondaryActionText]}>View Chats</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Notifications */}
        <View style={styles.notificationsSection}>
          <View style={styles.notificationsSectionHeader}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AllNotifications')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {dashboardData.notifications.length === 0 ? (
            <View style={styles.emptyNotifications}>
              <MaterialCommunityIcons name="bell-off" size={48} color="#ccc" />
              <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
              <Text style={styles.emptyNotificationsSubText}>
                Notifications about your products will appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={dashboardData.notifications.slice(0, 10)}
              keyExtractor={(item) => item._id}
              renderItem={renderNotificationItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Performance Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          
          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="trending-up" size={24} color="#4caf50" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Response Time</Text>
              <Text style={styles.insightValue}>Fast responder</Text>
              <Text style={styles.insightDescription}>
                You typically respond to messages within 30 minutes
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <MaterialCommunityIcons name="chart-line" size={24} color="#2f95dc" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Activity Level</Text>
              <Text style={styles.insightValue}>
                {dashboardData.recentActivity.totalUnread + 
                 dashboardData.recentActivity.newMessages + 
                 dashboardData.recentActivity.newInquiries > 10 ? 'High' : 'Moderate'}
              </Text>
              <Text style={styles.insightDescription}>
                Based on your recent interactions
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Tips for Better Sales</Text>
          
          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="lightbulb" size={20} color="#ff9800" />
            <Text style={styles.tipText}>
              Respond to inquiries quickly to increase your chances of making a sale
            </Text>
          </View>

          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="camera" size={20} color="#ff9800" />
            <Text style={styles.tipText}>
              Add high-quality photos to attract more buyers
            </Text>
          </View>

          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="tag" size={20} color="#ff9800" />
            <Text style={styles.tipText}>
              Price your items competitively based on market research
            </Text>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: '#2f95dc',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedPeriodButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  unreadSummary: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#ff6f61',
  },
  unreadSummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadSummaryText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 12,
    flex: 1,
  },
  markAllReadButton: {
    backgroundColor: '#ff6f61',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  markAllReadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2f95dc',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  secondaryAction: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2f95dc',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryActionText: {
    color: '#2f95dc',
  },
  notificationsSection: {
    marginBottom: 20,
  },
  notificationsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2f95dc',
    fontWeight: '500',
  },
  emptyNotifications: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginTop: 12,
  },
  emptyNotificationsSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#2f95dc',
    backgroundColor: '#f8f9ff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationProduct: {
    fontSize: 12,
    color: '#2f95dc',
    fontStyle: 'italic',
  },
  notificationProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 8,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2f95dc',
    position: 'absolute',
    top: 16,
    right: 16,
  },
  insightsSection: {
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  insightContent: {
    marginLeft: 12,
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f95dc',
    marginTop: 2,
  },
  insightDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});