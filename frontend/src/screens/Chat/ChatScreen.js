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
  Linking,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();
    
    // Set up navigation header
    navigation.setOptions({
      title: otherUser.username,
      headerStyle: { backgroundColor: '#2f95dc' },
      headerTintColor: '#fff',
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleCall}
          style={{ marginRight: 15 }}
        >
          <MaterialCommunityIcons name="phone" size={24} color="#fff" />
        </TouchableOpacity>
      )
    });
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const response = await fetch(
        `${API_URL}/api/messages/conversations/${conversation._id}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
      } else {
        console.error('Error fetching messages:', data.error);
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
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
    
    sendMessage({
      content: newMessage.trim(),
      messageType: 'text'
    });
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => pickImage('camera') },
        { text: 'Gallery', onPress: () => pickImage('gallery') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const pickImage = async (source) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access photos');
        return;
      }

      let result;
      if (source === 'camera') {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus.status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera permission');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]) {
        uploadAndSendImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAndSendImage = async (imageUri) => {
    try {
      setSending(true);

      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onload = async () => {
        const base64data = reader.result;
        
        // Upload to Cloudinary
        const token = await user.getIdToken();
        const uploadResponse = await fetch(`${API_URL}/api/messages/upload-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image: base64data })
        });

        const uploadData = await uploadResponse.json();

        if (uploadResponse.ok) {
          // Send image message
          sendMessage({
            messageType: 'image',
            imageUrl: uploadData.imageUrl,
            content: '📷 Image'
          });
        } else {
          Alert.alert('Error', uploadData.error || 'Failed to upload image');
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      setSending(false);
    }
  };

  const handleCall = () => {
    Alert.alert(
      'Make a Call',
      `Call ${otherUser.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            // You can implement actual calling functionality here
            // For now, we'll just log a call message
            sendMessage({
              messageType: 'call',
              content: '📞 Call started',
              callType: 'voice',
              callDuration: 0
            });
            
            // Open phone app (you might want to get the actual phone number from user profile)
            // Linking.openURL(`tel:${otherUser.phoneNumber}`);
          }
        }
      ]
    );
  };

  const shareProduct = () => {
    if (conversation.product) {
      sendMessage({
        messageType: 'product',
        content: '🛍️ Shared a product',
        sharedProduct: {
          productId: conversation.product._id,
          productTitle: conversation.product.title,
          productPrice: conversation.product.price,
          productImage: conversation.product.imagesUrls?.[0]
        }
      });
    }
  };

  const formatMessageTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId._id === user.uid || item.senderId.toString() === user.uid;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {/* Message Content */}
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          {item.messageType === 'text' && (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.content}
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

          {item.messageType === 'call' && (
            <View style={styles.callMessage}>
              <MaterialCommunityIcons 
                name="phone" 
                size={16} 
                color={isMyMessage ? '#fff' : '#2f95dc'} 
              />
              <Text style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
                { marginLeft: 5 }
              ]}>
                {item.content}
              </Text>
            </View>
          )}

          {/* Message Time */}
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(item.sentDate)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Product Info Header */}
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
          <TouchableOpacity onPress={shareProduct} style={styles.shareButton}>
            <MaterialCommunityIcons name="share" size={20} color="#2f95dc" />
          </TouchableOpacity>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          onPress={handleImagePicker} 
          style={styles.imageButton}
          disabled={sending}
        >
          <MaterialCommunityIcons name="camera" size={24} color="#2f95dc" />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={500}
          editable={!sending}
        />

        <TouchableOpacity 
          onPress={handleSendText} 
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          disabled={!newMessage.trim() || sending}
        >
          <MaterialCommunityIcons 
            name="send" 
            size={20} 
            color={(!newMessage.trim() || sending) ? '#ccc' : '#fff'} 
          />
        </TouchableOpacity>
      </View>

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
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  productHeader: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerProductImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  headerProductInfo: {
    flex: 1,
  },
  headerProductTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  headerProductPrice: {
    fontSize: 12,
    color: '#ff6f61',
    fontWeight: '500',
  },
  shareButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#2f95dc',
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: '#666',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  productMessage: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 8,
    marginBottom: 4,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  productPrice: {
    fontSize: 12,
    color: '#ff6f61',
    fontWeight: '500',
  },
  callMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  imageButton: {
    marginRight: 10,
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    backgroundColor: '#2f95dc',
    borderRadius: 20,
    padding: 10,
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
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
});