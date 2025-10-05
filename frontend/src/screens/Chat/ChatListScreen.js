// frontend/src/screens/Chat/ChatListScreen.js - FIXED VERSION with Socket.IO
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  TextInput,
  Animated,
  StatusBar,
  Alert
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
import Layout from "../../components/Layouts";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import io from "socket.io-client";

export default function ChatListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isConnected, setIsConnected] = useState(false);
  const swipeableRefs = useRef(new Map());
  const socketRef = useRef(null);

  // ✅ Initialize Socket.IO connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        const token = await user.getIdToken();
        
        socketRef.current = io(API_URL, {
          transports: ['websocket', 'polling'],
          auth: { token }
        });

        socketRef.current.on('connect', () => {
          console.log('✅ ChatList socket connected');
          setIsConnected(true);
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('❌ ChatList socket disconnected:', reason);
          setIsConnected(false);
        });

        // ✅ Listen for new messages (updates conversation list)
        socketRef.current.on('newMessage', (message) => {
          console.log('📨 New message received in ChatList:', message._id);
          updateConversationWithMessage(message);
        });

        // ✅ Listen for conversation updates
        socketRef.current.on('conversationUpdated', ({ conversationId, update }) => {
          console.log('🔄 Conversation updated:', conversationId);
          updateConversation(conversationId, update);
        });

        // ✅ Listen for message deletions
        socketRef.current.on('messageDeleted', ({ messageId, conversationId }) => {
          console.log('🗑️ Message deleted:', messageId);
          // Optionally refresh the conversation
          fetchConvs(true);
        });

        // ✅ Listen for messages read
        socketRef.current.on('messagesRead', ({ conversationId, messageIds, readBy }) => {
          console.log('✓✓ Messages read in conversation:', conversationId);
          // Update unread count for conversation
          setConversations(prev => prev.map(conv => {
            if (conv._id === conversationId) {
              return {
                ...conv,
                unreadCount: Math.max(0, conv.unreadCount - messageIds.length)
              };
            }
            return conv;
          }));
        });

      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    if (user) {
      initSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  // ✅ Update conversation with new message
  const updateConversationWithMessage = (message) => {
    setConversations(prev => {
      const updated = prev.map(conv => {
        // Check if message belongs to this conversation
        if (
          (conv.otherUser._id === message.senderId._id || 
           conv.otherUser._id === message.receiverId._id)
        ) {
          return {
            ...conv,
            lastMessage: {
              content: message.content,
              senderId: message.senderId,
              messageType: message.messageType,
              sentDate: message.sentDate
            },
            unreadCount: message.receiverId._id === user.uid ? 
              (conv.unreadCount || 0) + 1 : conv.unreadCount,
            updatedAt: message.sentDate
          };
        }
        return conv;
      });

      // Sort by most recent
      return updated.sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    });
  };

  // ✅ Update specific conversation
  const updateConversation = (conversationId, update) => {
    setConversations(prev => prev.map(conv => 
      conv._id === conversationId ? { ...conv, ...update } : conv
    ));
  };

  const fetchConvs = async (silent = false) => {
    try {
      const token = await user.getIdToken();
      const resp = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      if (resp.ok) {
        const grouped = {};
        (data.conversations || []).forEach(conv => {
          const otherId = conv.otherUser._id;
          if (
            !grouped[otherId] ||
            new Date(conv.updatedAt) > new Date(grouped[otherId].updatedAt)
          ) {
            grouped[otherId] = conv;
          }
        });
        const unique = Object.values(grouped);
        setConversations(unique);
        applyFilters(unique, activeFilter, searchQuery);
      } else if (!silent) {
        console.error('Error fetching conversations:', data.error);
      }
    } catch (err) {
      if (!silent) {
        console.error('Fetch conversations error:', err);
      }
    }
  };

  const applyFilters = (convos, filter, query) => {
    let filteredList = convos;
    
    if (filter === "unread") {
      filteredList = filteredList.filter(conv => conv.unreadCount > 0);
    } else if (filter === "groups") {
      filteredList = filteredList.filter(conv => conv.isGroupChat);
    }
    
    if (query.trim()) {
      const lower = query.toLowerCase();
      filteredList = filteredList.filter(conv => {
        return (
          conv.otherUser.username.toLowerCase().includes(lower) ||
          (conv.product?.title || "").toLowerCase().includes(lower) ||
          (conv.lastMessage?.content || "").toLowerCase().includes(lower)
        );
      });
    }
    
    setFiltered(filteredList);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchConvs();
      
      return () => {
        // Close any open swipeables when leaving screen
        swipeableRefs.current.forEach(ref => {
          ref?.close();
        });
      };
    }, [])
  );

  // Update filters when conversations change
  React.useEffect(() => {
    applyFilters(conversations, activeFilter, searchQuery);
  }, [conversations, activeFilter, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConvs().finally(() => setRefreshing(false));
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const formatTime = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const now = new Date();
    const diffH = (now - dt) / (1000 * 60 * 60);
    
    if (diffH < 1) {
      const diffM = Math.floor(diffH * 60);
      return diffM < 1 ? "now" : `${diffM}m`;
    } else if (diffH < 24) {
      return `${Math.floor(diffH)}h`;
    } else if (diffH < 48) {
      return "yesterday";
    } else {
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const handleDelete = (conversationId) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => deleteConversation(conversationId)
        }
      ]
    );
  };

  const deleteConversation = async (conversationId) => {
    try {
      const token = await user.getIdToken();
      const resp = await fetch(`${API_URL}/api/messages/conversations/${conversationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (resp.ok) {
        const updated = conversations.filter(conv => conv._id !== conversationId);
        setConversations(updated);
        applyFilters(updated, activeFilter, searchQuery);
        Alert.alert("Success", "Conversation deleted successfully");
      } else {
        const data = await resp.json();
        Alert.alert("Error", data.error || "Failed to delete conversation");
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      Alert.alert("Error", "Failed to delete conversation");
    }
  };

  const handleArchive = (conversationId) => {
    Alert.alert("Archived", "Conversation archived");
  };

  const renderRightActions = (progress, dragX, item) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity 
          style={[styles.swipeAction, styles.archiveAction]}
          onPress={() => {
            swipeableRefs.current.get(item._id)?.close();
            handleArchive(item._id);
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialCommunityIcons name="archive" size={24} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => {
            swipeableRefs.current.get(item._id)?.close();
            handleDelete(item._id);
          }}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialCommunityIcons name="delete" size={24} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const preview = () => {
      if (!item.lastMessage) return "Start a conversation";
      const type = item.lastMessage.messageType;
      if (type === "image") return "📷 Photo";
      if (type === "product") return "🛍️ Product shared";
      if (type === "call") return "📞 Voice call";
      return item.lastMessage.content?.substring(0, 40) + (item.lastMessage.content?.length > 40 ? "..." : "") || "New message";
    };

    const isUnread = item.unreadCount > 0;

    return (
      <Swipeable
        ref={ref => {
          if (ref) {
            swipeableRefs.current.set(item._id, ref);
          } else {
            swipeableRefs.current.delete(item._id);
          }
        }}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        rightThreshold={40}
        friction={2}
        overshootFriction={8}
      >
        <TouchableOpacity
          style={[styles.card, isUnread && styles.unreadCard]}
          onPress={() =>
            navigation.navigate("Chat", { conversation: item, otherUser: item.otherUser })
          }
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {item.otherUser.profilePictureUrl ? (
              <Image
                source={{ uri: item.otherUser.profilePictureUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.placeholderInitial}>
                  {item.otherUser.username?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {isUnread && <View style={styles.unreadBadge} />}
          </View>
          
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={[styles.username, isUnread && styles.unreadText]} numberOfLines={1}>
                {item.otherUser.username}
              </Text>
              {item.lastMessage && (
                <Text style={[styles.time, isUnread && styles.unreadTime]}>
                  {formatTime(item.lastMessage.sentDate)}
                </Text>
              )}
            </View>
            
            {item.product && (
              <Text style={styles.aboutText} numberOfLines={1}>
                💬 About: {item.product.title}
              </Text>
            )}
            
            <View style={styles.messageRow}>
              <Text 
                style={[styles.messageText, isUnread && styles.unreadText]} 
                numberOfLines={1}
              >
                {preview()}
              </Text>
              {item.lastMessage?.messageType === "image" && (
                <MaterialCommunityIcons name="image" size={16} color="#8E8E93" />
              )}
            </View>
            
            {isUnread && (
              <View style={styles.unreadCountBadge}>
                <Text style={styles.unreadCountText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>

          {item.product?.imagesUrls?.[0] && (
            <Image
              source={{ uri: item.product.imagesUrls[0] }}
              style={styles.productThumb}
            />
          )}

          <MaterialCommunityIcons 
            name="chevron-right" 
            size={20} 
            color="#C7C7CC" 
            style={styles.chevron}
          />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const FilterButton = ({ label, filter, icon }) => (
    <TouchableOpacity
      style={[styles.filterBtn, activeFilter === filter && styles.filterBtnActive]}
      onPress={() => handleFilterChange(filter)}
    >
      <MaterialCommunityIcons 
        name={icon} 
        size={16} 
        color={activeFilter === filter ? "#FFFFFF" : "#2F6F61"} 
      />
      <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Layout>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7F6" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Messages</Text>
          <Text style={styles.subtitle}>Connect with buyers & sellers</Text>
          
          {/* ✅ Socket connection status */}
          <View style={styles.statusIndicator}>
            <View style={[styles.onlineIndicator, !isConnected && styles.offlineIndicator]} />
            <Text style={[styles.statusText, !isConnected && styles.offlineText]}>
              {isConnected ? 'Live updates active' : 'Reconnecting...'}
            </Text>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            <FilterButton label="All" filter="all" icon="message-text" />
            <FilterButton label="Unread" filter="unread" icon="message-badge" />
            <FilterButton label="Groups" filter="groups" icon="account-group" />
          </View>
        </View>

        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
            {activeFilter === 'unread' && filtered.length > 0 && ' unread'}
          </Text>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="message-outline" size={80} color="#E0E6E3" />
            <Text style={styles.emptyTitle}>
              {searchQuery || activeFilter !== "all" ? "No matches found" : "No conversations yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || activeFilter !== "all" 
                ? "Try adjusting your search or filter" 
                : "Start chatting by messaging sellers from product pages"}
            </Text>
            {(searchQuery || activeFilter !== "all") && (
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
              >
                <Text style={styles.resetButtonText}>Show all conversations</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i._id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
          />
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F6",
    marginHorizontal:-14,
    marginVertical:-12,
    borderTopLeftRadius:12,
    borderTopRightRadius:12,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A1A1C",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  offlineIndicator: {
    backgroundColor: '#FF9500',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  offlineText: {
    color: '#FF9500',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1A1A1C",
    fontWeight: "500",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: "#2F6F61",
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#2F6F61",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
    minHeight: 90,
  },
  unreadCard: {
    borderLeftColor: "#2F6F61",
    backgroundColor: "#F8FFFD",
    shadowOpacity: 0.08,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#E0E6E3",
  },
  placeholderAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2F6F61",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderInitial: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1C",
    flex: 1,
  },
  unreadText: {
    fontWeight: "700",
    color: "#1A1A1C",
  },
  time: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "500",
  },
  unreadTime: {
    color: "#2F6F61",
    fontWeight: "600",
  },
  aboutText: {
    fontSize: 14,
    color: "#2F6F61",
    fontWeight: "500",
    marginBottom: 2,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageText: {
    fontSize: 15,
    color: "#8E8E93",
    flex: 1,
    marginRight: 8,
  },
  unreadCountBadge: {
    position: 'absolute',
    top: -5,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  chevron: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1C",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  resetButton: {
    marginTop: 20,
    backgroundColor: "#2F6F61",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  swipeActions: {
    flexDirection: "row",
    width: 160,
    height: "85%",
    marginVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  swipeAction: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  archiveAction: {
    backgroundColor: "#FF9500",
  },
  deleteAction: {
    backgroundColor: "#FF3B30",
  },
});