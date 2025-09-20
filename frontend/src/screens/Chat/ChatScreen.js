// frontend/src/screens/Chat/ModernChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, Modal, Dimensions,
  Keyboard, Animated, StatusBar, SafeAreaView
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../constants/config';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function ModernChatScreen() {
  const { user } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);
  const socketRef = useRef(null);

  const { conversation, otherUser } = route.params;

  // State management
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageActionModal, setMessageActionModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animation values
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const messageAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeChat();
    setupSocketConnection();
    setupKeyboardListeners();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initializeChat = async () => {
    await fetchMessages();
    await markMessagesAsRead();
    setupNavigationHeader();
  };

  const setupSocketConnection = () => {
    socketRef.current = io(API_URL, {
      query: { userId: user.uid }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      socketRef.current.emit('joinConversation', conversation._id);
    });

    socketRef.current.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socketRef.current.on('userTyping', ({ userId, isTyping }) => {
      if (userId === otherUser._id) {
        setOtherUserTyping(isTyping);
        if (isTyping) {
          startTypingAnimation();
        }
      }
    });

    socketRef.current.on('userOnline', ({ userId, isOnline }) => {
      if (userId === otherUser._id) {
        setOnlineStatus(isOnline);
      }
    });

    socketRef.current.on('messageRead', ({ messageIds }) => {
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg._id) 
            ? { ...msg, isRead: true }
            : msg
        )
      );
    });
  };

  const setupKeyboardListeners = () => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => scrollToBottom(), 100);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow?.remove();
      keyboardWillHide?.remove();
    };
  };

  const setupNavigationHeader = () => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerUsername}>{otherUser.username}</Text>
            {onlineStatus ? (
              <Text style={styles.onlineStatus}>online</Text>
            ) : (
              <Text style={styles.offlineStatus}>last seen recently</Text>
            )}
          </View>
        </View>
      ),
      headerStyle: { backgroundColor: '#075E54' },
      headerTintColor: '#fff',
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleVideoCall} style={styles.headerButton}>
            <MaterialCommunityIcons name="video" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCall} style={styles.headerButton}>
            <MaterialCommunityIcons name="phone" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMenuPress} style={styles.headerButton}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )
    });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(
        `${API_URL}/api/messages/conversations/${conversation._id}/messages`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/api/messages/conversations/${conversation._id}/mark-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (messageData) => {
    if (sending) return;

    try {
      setSending(true);
      const token = await user.getIdToken();

      // Optimistically add message to UI
      const tempMessage = {
        _id: Date.now().toString(),
        ...messageData,
        senderId: { _id: user.uid, username: 'You' },
        receiverId: otherUser._id,
        sentDate: new Date().toISOString(),
        isDelivered: false,
        isRead: false
      };

      setMessages(prev => [...prev, tempMessage]);
      scrollToBottom();

      const response = await fetch(`${API_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId: conversation._id,
          receiverId: otherUser._id,
          ...messageData
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Replace temp message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessage._id ? data.message : msg
          )
        );

        // Emit through socket for real-time delivery
        socketRef.current?.emit('sendMessage', {
          conversationId: conversation._id,
          message: data.message
        });

        setNewMessage('');
        setReplyingTo(null);
        
        // Animate message send
        Animated.spring(messageAnimation, {
          toValue: 1,
          useNativeDriver: true
        }).start(() => {
          messageAnimation.setValue(0);
        });

      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        Alert.alert('Error', data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    if (!newMessage.trim()) return;
    
    const messageData = {
      content: newMessage.trim(),
      messageType: 'text'
    };

    if (replyingTo) {
      messageData.replyTo = replyingTo._id;
      messageData.content = `📥 Replying to: "${replyingTo.content}"\n\n${messageData.content}`;
    }

    sendMessage(messageData);
    
    // Stop typing indicator
    handleTyping(false);
  };

  const handleTyping = (typing) => {
    if (typing !== isTyping) {
      setIsTyping(typing);
      socketRef.current?.emit('typing', {
        conversationId: conversation._id,
        userId: user.uid,
        isTyping: typing
      });
    }
  };

  const startTypingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.timing(typingAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSwipeReply = (message) => {
    setReplyingTo(message);
    textInputRef.current?.focus();
  };

  const handleLongPressMessage = (message) => {
    setSelectedMessage(message);
    setMessageActionModal(true);
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        socketRef.current?.emit('messageDeleted', { messageId, conversationId: conversation._id });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleCall = () => {
    Alert.alert(
      'Voice Call',
      `Call ${otherUser.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            sendMessage({
              messageType: 'call',
              content: '📞 Voice call',
              callType: 'voice',
              callDuration: 0
            });
          }
        }
      ]
    );
  };

  const handleVideoCall = () => {
    Alert.alert(
      'Video Call',
      `Video call ${otherUser.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            sendMessage({
              messageType: 'call',
              content: '📹 Video call',
              callType: 'video',
              callDuration: 0
            });
          }
        }
      ]
    );
  };

  const handleMenuPress = () => {
    Alert.alert(
      'Chat Options',
      'Choose an option',
      [
        { text: 'View Contact', onPress: () => {} },
        { text: 'Media & Links', onPress: () => {} },
        { text: 'Search', onPress: () => {} },
        { text: 'Mute', onPress: () => {} },
        { text: 'Wallpaper', onPress: () => {} },
        { text: 'Clear Chat', onPress: () => {}, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMessageStatusIcon = (message) => {
    const isMyMessage = message.senderId._id?.toString() === user.uid || 
                       message.senderId?.firebaseUid === user.uid;
    
    if (!isMyMessage) return null;

    if (message.isRead) {
      return <MaterialCommunityIcons name="check-all" size={16} color="#4FC3F7" />;
    } else if (message.isDelivered) {
      return <MaterialCommunityIcons name="check-all" size={16} color="#B0BEC5" />;
    } else {
      return <MaterialCommunityIcons name="check" size={16} color="#B0BEC5" />;
    }
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId._id?.toString() === user.uid || 
                       item.senderId?.firebaseUid === user.uid ||
                       item.senderId?.toString() === user.uid;
    
    const showTime = index === 0 || 
                    (messages[index - 1] && 
                     new Date(item.sentDate).getTime() - new Date(messages[index - 1].sentDate).getTime() > 300000);

    return (
      
      <View>
        {showTime && (
          <View style={styles.timeStamp}>
            <Text style={styles.timeStampText}>
              {new Date(item.sentDate).toLocaleDateString() === new Date().toLocaleDateString()
                ? 'Today'
                : new Date(item.sentDate).toLocaleDateString()
              }
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          onLongPress={() => handleLongPressMessage(item)}
          delayLongPress={300}
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessage : styles.otherMessage
          ]}
        >
          <PanGestureHandler
            onGestureEvent={(e) => {
              if (e.nativeEvent.translationX > 50) {
                handleSwipeReply(item);
              }
            }}
          >
            <Animated.View style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
              {
                transform: [{
                  scale: item._id === messages[messages.length - 1]?._id 
                    ? messageAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    : 1
                }]
              }
            ]}>
              
              {/* Reply indicator */}
              {item.content?.startsWith('📥 Replying to:') && (
                <View style={styles.replyIndicator}>
                  <View style={styles.replyLine} />
                  <Text style={styles.replyText} numberOfLines={1}>
                    {item.content.split('\n')[0].replace('📥 Replying to: "', '').replace('"', '')}
                  </Text>
                </View>
              )}

              {/* Message content */}
              {item.messageType === 'text' && (
                <Text style={[
                  styles.messageText,
                  isMyMessage ? styles.myMessageText : styles.otherMessageText
                ]}>
                  {item.content?.includes('📥 Replying to:') 
                    ? item.content.split('\n\n')[1] || item.content
                    : item.content
                  }
                </Text>
              )}

              {item.messageType === 'image' && (
                <TouchableOpacity onPress={() => {
                  setSelectedImage(item.imageUrl);
                  setImageModalVisible(true);
                }}>
                  <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
                </TouchableOpacity>
              )}

              {item.messageType === 'product' && item.sharedProduct && (
                <TouchableOpacity 
                  style={styles.productMessage}
                  onPress={() => navigation.navigate('ProductDetails', { 
                    product: { 
                      _id: item.sharedProduct.productId,
                      title: item.sharedProduct.productTitle,
                      price: item.sharedProduct.productPrice,
                      imagesUrls: [item.sharedProduct.productImage]
                    } 
                  })}
                >
                  <Image 
                    source={{ uri: item.sharedProduct.productImage }} 
                    style={styles.productImage} 
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{item.sharedProduct.productTitle}</Text>
                    <Text style={styles.productPrice}>LKR {item.sharedProduct.productPrice}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Message time and status */}
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                ]}>
                  {formatMessageTime(item.sentDate)}
                </Text>
                {getMessageStatusIcon(item)}
              </View>
            </Animated.View>
          </PanGestureHandler>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />
      
      {/* Chat Background */}
      <LinearGradient
        colors={['#ECE5DD', '#F5F5F5']}
        style={styles.chatBackground}
      >
        
        {/* Product Header */}
        {conversation.product && (
          <View style={styles.productHeader}>
            <Image 
              source={{ uri: conversation.product.imagesUrls?.[0] }} 
              style={styles.headerProductImage} 
            />
            <View style={styles.headerProductInfo}>
              <Text style={styles.headerProductTitle}>{conversation.product.title}</Text>
              <Text style={styles.headerProductPrice}>LKR {conversation.product.price}</Text>
            </View>
            <TouchableOpacity style={styles.shareButton}>
              <MaterialCommunityIcons name="share" size={20} color="#075E54" />
            </TouchableOpacity>
          </View>
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <Animated.View style={styles.replyPreview}>
            <View style={styles.replyContent}>
              <MaterialCommunityIcons name="reply" size={16} color="#075E54" />
              <Text style={styles.replyText} numberOfLines={1}>
                Replying to: {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <MaterialCommunityIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          style={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />

        {/* Typing Indicator */}
        {otherUserTyping && (
          <Animated.View style={[
            styles.typingIndicator,
            {
              opacity: typingAnimation
            }
          ]}>
            <Text style={styles.typingText}>{otherUser.username} is typing...</Text>
          </Animated.View>
        )}

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        >
          <View style={[
            styles.inputContainer,
            { marginBottom: Platform.OS === 'android' ? keyboardHeight * 0.1 : 0 }
          ]}>
            <View style={styles.inputRow}>
              
              {/* Attachment Button */}
              <TouchableOpacity style={styles.attachmentButton}>
                <MaterialCommunityIcons name="plus" size={24} color="#7E8B96" />
              </TouchableOpacity>

              {/* Text Input */}
              <View style={styles.textInputContainer}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  value={newMessage}
                  onChangeText={(text) => {
                    setNewMessage(text);
                    handleTyping(text.length > 0);
                  }}
                  placeholder="Type a message"
                  multiline
                  maxLength={1000}
                  editable={!sending}
                  onFocus={scrollToBottom}
                  onBlur={() => handleTyping(false)}
                />
                
                {/* Emoji Button */}
                <TouchableOpacity style={styles.emojiButton}>
                  <MaterialCommunityIcons name="emoticon-happy-outline" size={22} color="#7E8B96" />
                </TouchableOpacity>
              </View>

              {/* Camera Button */}
              <TouchableOpacity style={styles.cameraButton}>
                <MaterialCommunityIcons name="camera" size={22} color="#7E8B96" />
              </TouchableOpacity>

              {/* Send/Voice Button */}
              {newMessage.trim() ? (
                <TouchableOpacity 
                  onPress={handleSendText}
                  style={styles.sendButton}
                  disabled={sending}
                >
                  <MaterialCommunityIcons 
                    name="send" 
                    size={20} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.voiceButton}>
                  <MaterialCommunityIcons name="microphone" size={22} color="#7E8B96" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Message Action Modal */}
        <Modal
          visible={messageActionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setMessageActionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.actionModal}>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setReplyingTo(selectedMessage);
                    setMessageActionModal(false);
                    textInputRef.current?.focus();
                  }}
                >
                  <MaterialCommunityIcons name="reply" size={22} color="#075E54" />
                  <Text style={styles.actionButtonText}>Reply</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // Copy to clipboard functionality
                    setMessageActionModal(false);
                  }}
                >
                  <MaterialCommunityIcons name="content-copy" size={22} color="#075E54" />
                  <Text style={styles.actionButtonText}>Copy</Text>
                </TouchableOpacity>

                {selectedMessage?.senderId?._id?.toString() === user.uid && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setMessageActionModal(false);
                      Alert.alert(
                        'Delete Message',
                        'Are you sure you want to delete this message?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Delete', 
                            style: 'destructive',
                            onPress: () => handleDeleteMessage(selectedMessage._id)
                          }
                        ]
                      );
                    }}
                  >
                    <MaterialCommunityIcons name="delete" size={22} color="#E57373" />
                    <Text style={[styles.actionButtonText, { color: '#E57373' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setMessageActionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Image Modal */}
        <Modal
          visible={imageModalVisible}
          transparent
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.imageModalContainer}>
            <TouchableOpacity 
              style={styles.imageModalBackdrop}
              onPress={() => setImageModalVisible(false)}
            >
              <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeImageButton}
              onPress={() => setImageModalVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>

      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#075E54',
  },
  chatBackground: {
    flex: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerUserInfo: {
    marginLeft: 10,
  },
  headerUsername: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineStatus: {
    color: '#B8E6B8',
    fontSize: 12,
  },
  offlineStatus: {
    color: '#E0E0E0',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 20,
    padding: 4,
  },
  productHeader: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerProductImage: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 12,
  },
  headerProductInfo: {
    flex: 1,
  },
  headerProductTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  headerProductPrice: {
    fontSize: 13,
    color: '#25D366',
    fontWeight: '600',
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#075E54',
  },
  replyContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyText: {
    marginLeft: 8,
    color: '#666',
    fontStyle: 'italic',
    fontSize: 14,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  timeStamp: {
    alignItems: 'center',
    marginVertical: 15,
  },
  timeStampText: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 8,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMessageBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingLeft: 8,
  },
  replyLine: {
    width: 3,
    height: 20,
    backgroundColor: '#075E54',
    borderRadius: 2,
    marginRight: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#000',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  productMessage: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    color: '#25D366',
    fontWeight: '600',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  myMessageTime: {
    color: '#666',
  },
  otherMessageTime: {
    color: '#999',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 4,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  attachmentButton: {
    padding: 8,
    marginLeft: 4,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
    color: '#000',
  },
  emojiButton: {
    padding: 4,
  },
  cameraButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  sendButton: {
    backgroundColor: '#25D366',
    borderRadius: 20,
    padding: 8,
    marginLeft: 4,
    marginRight: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  voiceButton: {
    padding: 8,
    marginLeft: 4,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 0,
    width: width * 0.8,
    maxWidth: 300,
    overflow: 'hidden',
  },
  modalActions: {
    paddingVertical: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  actionButtonText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#075E54',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  closeImageButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
});