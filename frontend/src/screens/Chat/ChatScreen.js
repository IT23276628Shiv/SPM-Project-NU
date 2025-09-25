// frontend/src/screens/Chat/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';

export default function ChatScreen() {
  const { user } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef(null);

  const { conversation, otherUser } = route.params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  // Group messages by date
  const groupMessagesByDate = (messagesArray) => {
    const grouped = {};
    messagesArray.forEach(message => {
      const date = new Date(message.sentDate).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  };

  const [groupedMessages, setGroupedMessages] = useState({});

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();
    setupNavigation();

    // Simulate online status
    const interval = setInterval(() => {
      setIsOnline(prev => !prev); // Simulate status change for demo
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setGroupedMessages(groupMessagesByDate(messages));
    }
  }, [messages]);

  const setupNavigation = () => {
    navigation.setOptions({
      title: '',
      headerStyle: { 
        backgroundColor: '#2F6F61',
        shadowColor: 'transparent',
        elevation: 0,
      },
      headerTintColor: '#fff',
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerUserName}>{otherUser.username}</Text>
            <Text style={styles.headerUserStatus}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleVoiceCall} style={styles.headerIcon}>
            <MaterialCommunityIcons name="phone" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMore} style={styles.headerIcon}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/messages/conversations/${conversation._id}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        console.error('Error fetching messages:', data.error);
        Alert.alert('Error', 'Failed to load messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(
        `${API_URL}/api/messages/conversations/${conversation._id}/mark-read`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const sendMessage = async (messageData) => {
    if (sending) return;

    try {
      setSending(true);
      const token = await user.getIdToken();

      const messagePayload = {
        conversationId: conversation._id,
        receiverId: otherUser._id,
        ...messageData,
        ...(replyTo && { replyTo: replyTo._id })
      };

      const response = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messagePayload),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { 
          ...data.message, 
          status: 'sent',
          _id: Date.now().toString() // Temporary ID for immediate display
        }]);
        setNewMessage('');
        setReplyTo(null);
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    if (!newMessage.trim()) return;
    sendMessage({ content: newMessage.trim(), messageType: 'text' });
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndSendImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image pick error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAndSendImage = async (uri) => {
    try {
      setSending(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', {
        uri: uri,
        type: 'image/jpeg',
        name: 'chat-image.jpg',
      });

      const token = await user.getIdToken();
      const uploadResponse = await fetch(`${API_URL}/api/messages/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (uploadResponse.ok) {
        sendMessage({
          messageType: 'image',
          imageUrl: uploadData.imageUrl,
          content: '📷 Image',
        });
      } else {
        throw new Error(uploadData.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const handleVoiceCall = () => {
    Alert.alert(
      'Voice Call', 
      `Call ${otherUser.username}?`, 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            // Simulate call - integrate with your call service
            sendMessage({
              messageType: 'call',
              content: '📞 Voice call - 5:32',
              callType: 'voice',
              callDuration: 332,
            });
          },
        },
      ]
    );
  };

  const handleMore = () => {
    Alert.alert(
      'Chat Options',
      '',
      [
        { text: 'View Profile', onPress: () => {} },
        { text: 'Clear Chat', onPress: clearChat, style: 'destructive' },
        { text: 'Block User', onPress: blockUser, style: 'destructive' },
        { text: 'Close Inquiry', onPress: closeInquiry, style: 'default' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const closeInquiry = () => {
    Alert.alert(
      'Close Inquiry',
      'Are you sure you want to close this product inquiry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Close Inquiry', 
          onPress: () => {
            // Implement close inquiry logic
            Alert.alert('Success', 'Inquiry closed successfully');
          }
        },
      ]
    );
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              const response = await fetch(
                `${API_URL}/api/messages/conversations/${conversation._id}/clear`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              
              if (response.ok) {
                setMessages([]);
                Alert.alert('Success', 'Chat cleared successfully');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to clear chat');
            }
          }
        },
      ]
    );
  };

  const deleteMessage = async (messageId) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${API_URL}/api/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  const blockUser = () => {
    Alert.alert(
      'Block User',
      `Block ${otherUser.username}? You won't receive messages from them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const shareProduct = () => {
    if (conversation.product) {
      sendMessage({
        messageType: 'product',
        content: `🛍️ ${conversation.product.title}`,
        sharedProduct: {
          productId: conversation.product._id,
          productTitle: conversation.product.title,
          productPrice: conversation.product.price,
          productImage: conversation.product.imagesUrls?.[0],
        },
      });
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const getMessageStatus = (message) => {
    if (message.status === 'seen') return 'Seen';
    if (message.status === 'delivered') return 'Delivered';
    return 'Sent';
  };

  const renderDateHeader = (date) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{formatDateHeader(date)}</Text>
    </View>
  );

  const renderReplySection = () => {
    if (!replyTo) return null;

    return (
      <View style={styles.replyContainer}>
        <View style={styles.replyIndicator}>
          <MaterialCommunityIcons name="reply" size={16} color="#2F6F61" />
          <Text style={styles.replyLabel}>Replying to</Text>
        </View>
        <View style={styles.replyContent}>
          <Text style={styles.replyUsername}>
            {replyTo.senderId._id === user.uid ? 'You' : otherUser.username}
          </Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {replyTo.messageType === 'image' ? '📷 Photo' : replyTo.content}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyClose}>
          <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId._id === user.uid || item.senderId === user.uid;

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        <View style={styles.messageWrapper}>
          {/* Reply Preview */}
          {item.replyTo && (
            <TouchableOpacity 
              style={[
                styles.replyPreview,
                isMyMessage ? styles.myReplyPreview : styles.otherReplyPreview
              ]}
              onPress={() => {
                // Scroll to replied message
                const repliedIndex = messages.findIndex(m => m._id === item.replyTo._id);
                if (repliedIndex !== -1) {
                  flatListRef.current?.scrollToIndex({ index: repliedIndex, animated: true });
                }
              }}
            >
              <View style={styles.replyPreviewBar} />
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replyPreviewName}>
                  {item.replyTo.senderId._id === user.uid ? 'You' : otherUser.username}
                </Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {item.replyTo.messageType === 'image' ? '📷 Photo' : item.replyTo.content}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Message Bubble */}
          <TouchableOpacity
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}
            onLongPress={() => {
              Alert.alert(
                'Message Options',
                '',
                [
                  { 
                    text: 'Reply', 
                    onPress: () => setReplyTo(item) 
                  },
                  { 
                    text: 'Delete', 
                    style: 'destructive', 
                    onPress: () => {
                      Alert.alert(
                        'Delete Message',
                        'Are you sure?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(item._id) }
                        ]
                      );
                    }
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            {item.messageType === 'text' && (
              <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                {item.content}
              </Text>
            )}
            
            {item.messageType === 'image' && item.imageUrl && (
              <TouchableOpacity 
                onPress={() => {
                  setSelectedImage(item.imageUrl);
                  setImageModalVisible(true);
                }}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
                <View style={styles.imageOverlay}>
                  <MaterialCommunityIcons name="magnify-plus" size={20} color="white" />
                </View>
              </TouchableOpacity>
            )}
            
            {item.messageType === 'product' && item.sharedProduct && (
              <TouchableOpacity
                style={styles.productMessage}
                onPress={() => navigation.navigate('ProductDetails', {
                  productId: item.sharedProduct.productId,
                })}
              >
                <Image
                  source={{ uri: item.sharedProduct.productImage }}
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>{item.sharedProduct.productTitle}</Text>
                  <Text style={styles.productPrice}>LKR {item.sharedProduct.productPrice}</Text>
                  <Text style={styles.productLabel}>Tap to view product</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {item.messageType === 'call' && (
              <View style={styles.callMessage}>
                <MaterialCommunityIcons
                  name={item.callType === 'video' ? 'video' : 'phone'}
                  size={16}
                  color={isMyMessage ? '#fff' : '#2F6F61'}
                />
                <Text style={[styles.callText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                  {item.content}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Message Status and Time */}
          <View style={[styles.messageMeta, isMyMessage ? styles.myMessageMeta : styles.otherMessageMeta]}>
            <Text style={styles.messageTime}>{formatMessageTime(item.sentDate)}</Text>
            {isMyMessage && (
              <Text style={styles.messageStatus}>{getMessageStatus(item)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item: dateGroup }) => (
    <View>
      {renderDateHeader(dateGroup.date)}
      {dateGroup.messages.map((message) => (
        <View key={message._id}>
          {renderMessage({ item: message })}
        </View>
      ))}
    </View>
  );

  const flattenedData = Object.entries(groupedMessages).map(([date, messages]) => ({
    date,
    messages
  }));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#2F6F61" />
      
      {/* Product Header with Close Option */}
      {conversation.product && (
        <View style={styles.productHeader}>
          <View style={styles.productHeaderContent}>
            <Image
              source={{ uri: conversation.product.imagesUrls?.[0] }}
              style={styles.headerProductImage}
            />
            <View style={styles.headerProductInfo}>
              <Text style={styles.headerProductTitle}>{conversation.product.title}</Text>
              <Text style={styles.headerProductPrice}>LKR {conversation.product.price?.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={shareProduct} style={styles.shareButton}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#2F6F61" />
            </TouchableOpacity>
            <TouchableOpacity onPress={closeInquiry} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={flattenedData}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="message-outline" size={60} color="#E0E6E3" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>Start the conversation by sending a message!</Text>
            </View>
          )
        }
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6F61" />
        </View>
      )}

      {/* Reply Section */}
      {renderReplySection()}

      {/* Input Container */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          onPress={handleImagePicker} 
          style={styles.attachButton}
          disabled={sending}
        >
          <MaterialCommunityIcons name="image" size={24} color="#2F6F61" />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={1000}
          editable={!sending}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendText}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons
              name="send"
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <Image source={{ uri: selectedImage }} style={styles.fullImage} />
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setImageModalVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F6",
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  headerUserInfo: {
    marginLeft: 8,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerUserStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 4,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#FFFFFF",
    margin: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  headerProductInfo: {
    flex: 1,
  },
  headerProductTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1C",
    marginBottom: 2,
  },
  headerProductPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2F6F61",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  shareButton: {
    padding: 8,
    backgroundColor: "#F0F7F5",
    borderRadius: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    backgroundColor: '#E8F0EC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#2F6F61',
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessage: {
    alignItems: "flex-end",
  },
  otherMessage: {
    alignItems: "flex-start",
  },
  messageWrapper: {
    maxWidth: "80%",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 2,
  },
  myMessageBubble: {
    backgroundColor: "#2F6F61",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#1A1A1C",
  },
  messageMeta: {
    flexDirection: "row",
    marginTop: 2,
  },
  myMessageMeta: {
    justifyContent: "flex-end",
  },
  otherMessageMeta: {
    justifyContent: "flex-start",
  },
  messageTime: {
    fontSize: 11,
    color: "#8E8E93",
  },
  messageStatus: {
    fontSize: 11,
    color: "#8E8E93",
    marginLeft: 4,
    fontStyle: 'italic',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productMessage: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 8,
    width: 200,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 8,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "inherit",
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "inherit",
    marginBottom: 4,
  },
  productLabel: {
    fontSize: 10,
    color: "inherit",
    opacity: 0.8,
  },
  callMessage: {
    flexDirection: "row",
    alignItems: "center",
  },
  callText: {
    marginLeft: 6,
  },
  replyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7F5",
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2F6F61",
  },
  replyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  replyLabel: {
    fontSize: 12,
    color: "#2F6F61",
    marginLeft: 4,
    fontWeight: "500",
  },
  replyContent: {
    flex: 1,
    marginRight: 8,
  },
  replyUsername: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2F6F61",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  replyClose: {
    padding: 4,
  },
  replyPreview: {
    flexDirection: "row",
    backgroundColor: "rgba(47,111,97,0.1)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#2F6F61",
  },
  replyPreviewBar: {
    width: 3,
    backgroundColor: "#2F6F61",
    borderRadius: 2,
    marginRight: 8,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2F6F61",
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 11,
    color: "#8E8E93",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E8F0EC",
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F5F7F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: "#2F6F61",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#C8C8C8",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1C",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "95%",
    height: "80%",
    resizeMode: "contain",
    borderRadius: 12,
  },
  modalClose: {
    position: "absolute",
    top: 60,
    right: 20,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
});