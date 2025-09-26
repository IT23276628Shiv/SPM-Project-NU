// frontend/src/screens/Chat/ChatListScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';
import Layout from '../../components/Layouts';

const { width } = Dimensions.get('window');

export default function ChatListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        // Group conversations by other user to prevent duplicates
        const groupedConversations = {};
        
        data.conversations?.forEach(conv => {
          const otherUserId = conv.otherUser._id;
          
          // If we already have a conversation with this user, keep the most recent one
          if (!groupedConversations[otherUserId] || 
              new Date(conv.updatedAt) > new Date(groupedConversations[otherUserId].updatedAt)) {
            groupedConversations[otherUserId] = conv;
          }
        });

        const uniqueConversations = Object.values(groupedConversations);
        setConversations(uniqueConversations);
        setFilteredConversations(uniqueConversations);
      } else {
        console.error('Error fetching conversations:', data.error);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchConversations().finally(() => setRefreshing(false));
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.otherUser.username.toLowerCase().includes(query.toLowerCase()) ||
        (conv.product?.title || '').toLowerCase().includes(query.toLowerCase()) ||
        (conv.lastMessage?.content || '').toLowerCase().includes(query.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchConversations();
    }, [])
  );

  const formatLastMessageTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleDeleteConversation = (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteConversation(conversationId)
        }
      ]
    );
  };

  const deleteConversation = async (conversationId) => {
    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/messages/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const updatedConversations = conversations.filter(conv => conv._id !== conversationId);
        setConversations(updatedConversations);
        setFilteredConversations(updatedConversations);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation');
    }
  };

  const renderRightActions = (conversationId) => {
    return (
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => handleDeleteConversation(conversationId)}
        >
          <MaterialCommunityIcons name="delete" size={24} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderConversationItem = ({ item }) => {
    const lastMessagePreview = () => {
      if (!item.lastMessage) return 'No messages yet';
      
      switch (item.lastMessage.messageType) {
        case 'image':
          return '📷 Image';
        case 'product':
          return '🛍️ Shared a product';
        case 'call':
          return '📞 Call';
        default:
          return item.lastMessage.content || 'Message';
      }
    };

    return (
      <Swipeable renderRightActions={() => renderRightActions(item._id)}>
        <TouchableOpacity
          style={styles.conversationItem}
          onPress={() => navigation.navigate('Chat', { 
            conversation: item,
            otherUser: item.otherUser 
          })}
        >
          <View style={styles.conversationContent}>
            {/* Profile Picture */}
            <View style={styles.profileSection}>
              {item.otherUser.profilePictureUrl ? (
                <Image 
                  source={{ uri: item.otherUser.profilePictureUrl }} 
                  style={styles.profilePicture} 
                />
              ) : (
                <View style={styles.defaultProfile}>
                  <Text style={styles.defaultProfileText}>
                    {item.otherUser.username?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>

            {/* Chat Info */}
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.username}>{item.otherUser.username}</Text>
                {item.lastMessage && (
                  <Text style={styles.timestamp}>
                    {formatLastMessageTime(item.lastMessage.sentDate)}
                  </Text>
                )}
              </View>

              {/* Product Info if available */}
              {item.product && (
                <Text style={styles.productInfo}>
                  About: {item.product.title}
                </Text>
              )}

              {/* Last Message */}
              <Text 
                style={[
                  styles.lastMessage, 
                  item.unreadCount > 0 && styles.unreadMessage
                ]}
                numberOfLines={1}
              >
                {lastMessagePreview()}
              </Text>
            </View>

            {/* Product Thumbnail */}
            {item.product && item.product.imagesUrls?.[0] && (
              <Image 
                source={{ uri: item.product.imagesUrls[0] }} 
                style={styles.productThumbnail} 
              />
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <Text>Loading conversations...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <View style={styles.container}>
        {/* Header with search */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Messages</Text>
            <TouchableOpacity
              onPress={() => setSearchVisible(!searchVisible)}
              style={styles.searchButton}
            >
              <MaterialCommunityIcons name="magnify" size={24} color="#2f95dc" />
            </TouchableOpacity>
          </View>
          
          {searchVisible && (
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus={searchVisible}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleSearch('')}
                  style={styles.clearButton}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            {searchQuery ? (
              <>
                <Text style={styles.emptyText}>No conversations found</Text>
                <Text style={styles.emptySubText}>
                  Try searching with different keywords
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No conversations yet</Text>
                <Text style={styles.emptySubText}>
                  Start chatting with sellers from product details
                </Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item._id}
            renderItem={renderConversationItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  listContainer: {
    paddingTop: 8,
  },
  conversationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  conversationContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  profileSection: {
    position: 'relative',
    marginRight: 12,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultProfile: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2f95dc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff6f61',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  productInfo: {
    fontSize: 12,
    color: '#2f95dc',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  productThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 8,
  },
  rightActions: {
    width: 80,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginRight: 16,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});