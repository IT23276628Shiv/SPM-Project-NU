// MessagesListScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getConversationsAPI, getUserByIdAPI } from '../../api/message';
import { useAuth } from '../../context/AuthContext';

export default function MessagesListScreen({ navigation }) {
  const { userDetails } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('MessagesListScreen - userDetails:', JSON.stringify(userDetails, null, 2));
    if (userDetails?._id) {
      fetchConversations();
    } else {
      console.warn('MessagesListScreen - No userDetails._id, cannot fetch conversations');
      setLoading(false);
    }
  }, [userDetails]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      console.log('fetchConversations - Starting for userId:', userDetails._id);
      const convos = await getConversationsAPI(userDetails._id);
      console.log('fetchConversations - Raw conversations:', JSON.stringify(convos, null, 2));

      // Fetch user details for each otherUser
      const updatedConvos = await Promise.all(
        convos.map(async (convo) => {
          try {
            const userData = await getUserByIdAPI(convo.otherUser);
            console.log('fetchConversations - User data for', convo.otherUser, ':', JSON.stringify(userData, null, 2));
            return {
              id: convo.otherUser,
              username: userData?.username || 'Unknown User',
              profilePictureUrl: userData?.profilePictureUrl || 'https://via.placeholder.com/150',
              lastMessage: convo.lastMessage,
              otherUser: convo.otherUser,
              productId: convo.productId,
              timestamp: convo.timestamp,
              unreadCount: convo.unreadCount,
            };
          } catch (err) {
            console.error('fetchConversations - Failed to fetch user', convo.otherUser, ':', err.message);
            return {
              id: convo.otherUser,
              username: 'Unknown User',
              profilePictureUrl: 'https://via.placeholder.com/150',
              lastMessage: convo.lastMessage,
              otherUser: convo.otherUser,
              productId: convo.productId,
              timestamp: convo.timestamp,
              unreadCount: convo.unreadCount,
            };
          }
        })
      );

      console.log('fetchConversations - Updated conversations:', JSON.stringify(updatedConvos, null, 2));
      setConversations(updatedConvos);
    } catch (err) {
      console.error('fetchConversations - Error:', err.message, err.response?.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('onRefresh - Refreshing conversations');
    fetchConversations();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => {
        console.log('Navigating to Chat with:', { otherUser: item.otherUser, productId: item.productId });
        navigation.navigate('Chat', {
          otherUser: item.otherUser,
          productId: item.productId,
        });
      }}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: item.profilePictureUrl }}
          style={styles.avatar}
        />
        {item.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        </View>

        <View style={styles.messageRow}>
          <Text
            style={[styles.lastMessage, item.unreadCount > 0 && styles.unreadMessage]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 ? (
            <Ionicons name="checkmark-done" size={16} color="#5E8B7E" />
          ) : (
            <Ionicons name="checkmark" size={16} color="#A6A6A6" />
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#C4C4C4" />
    </TouchableOpacity>
  );

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E8B7E" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={22} color="#5E8B7E" />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color="#C4C4C4" />
          </View>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a conversation to see messages here
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#5E8B7E']}
              tintColor="#5E8B7E"
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    padding: 16,
  },
  contentContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2F5D62',
    letterSpacing: 0.5,
  },
  searchButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#5E8B7E',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DF5E5E',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F5D62',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#A6A6A6',
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#7A7A7A',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: '#2F5D62',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5E8B7E',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#7A7A7A',
  },
});