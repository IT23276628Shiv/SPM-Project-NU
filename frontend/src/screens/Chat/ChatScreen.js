// frontend/src/screens/Chat/ChatScreen.js - ENHANCED VERSION
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  StatusBar,
  ActivityIndicator,
  Animated,
  Pressable,
  Dimensions,
  LayoutAnimation,
  UIManager,
  Vibration,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import * as ImagePicker from "expo-image-picker";
import { useRoute, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../constants/config";
import io from "socket.io-client";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get("window");

const ANIMATION_CONFIG = {
  duration: 250,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
};

// Enhanced Message Actions Modal
const MessageActionsModal = ({ visible, onClose, message, isMyMessage, onReply, onCopy, onDelete }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    }
  }, [visible]);

  const actions = [
    {
      icon: "reply",
      label: "Reply",
      color: "#2F6F61",
      onPress: () => {
        onReply();
        onClose();
      },
    },
    {
      icon: "content-copy",
      label: "Copy",
      color: "#007AFF",
      onPress: () => {
        onCopy();
        onClose();
      },
    },
  ];

  if (isMyMessage) {
    actions.push({
      icon: "delete",
      label: "Delete",
      color: "#FF3B30",
      onPress: () => {
        onDelete();
        onClose();
      },
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.actionsModalContent,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.actionsModalTitle}>Message Actions</Text>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionItem}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: `${action.color}15` }]}>
                <MaterialCommunityIcons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default function ChatScreen() {
  const { user, userDetails } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  const socketRef = useRef(null);
  const isInitialLoad = useRef(true);
  const isUserScrolling = useRef(false);
  const messageIdsRef = useRef(new Set());
  const lastReadEmit = useRef(0);

  const { conversation, otherUser } = route.params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [inquiryStatus, setInquiryStatus] = useState(conversation.inquiryStatus || "none");
  const [inquiryClosedAt, setInquiryClosedAt] = useState(conversation.inquiryClosedAt);
  const [inquiryClosedBy, setInquiryClosedBy] = useState(conversation.inquiryClosedBy);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState(null);

  // Initialize Socket.IO
  useEffect(() => {
    const initSocket = async () => {
      try {
        if (userDetails?._id) {
          setCurrentUserId(userDetails._id);
        }

        const token = await user.getIdToken();

        socketRef.current = io(API_URL, {
          transports: ["websocket", "polling"],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current.on("connect", () => {
          console.log("✅ Chat socket connected");
          setIsConnected(true);
          socketRef.current.emit("joinConversation", conversation._id);
        });

        socketRef.current.on("disconnect", (reason) => {
          console.log("❌ Chat socket disconnected:", reason);
          setIsConnected(false);
        });

        socketRef.current.on("conversationJoined", ({ conversationId }) => {
          console.log("✅ Joined conversation:", conversationId);
        });

        socketRef.current.on("newMessage", (message) => {
          console.log("📨 New message received:", message._id);

          if (messageIdsRef.current.has(message._id)) {
            console.log("⚠️ Duplicate message ignored (ref):", message._id);
            return;
          }

          LayoutAnimation.configureNext(ANIMATION_CONFIG);

          setMessages((prev) => {
            if (prev.some((m) => m._id === message._id)) {
              console.log("⚠️ Duplicate message ignored (state):", message._id);
              return prev;
            }

            messageIdsRef.current.add(message._id);

            if (isUserScrolling.current) {
              setNewMessagesCount((count) => count + 1);
              if (Platform.OS === "android") {
                Vibration.vibrate(50);
              }
            }

            return [...prev, message];
          });

          if (!isUserScrolling.current || isInitialLoad.current) {
            setTimeout(
              () => flatListRef.current?.scrollToEnd({ animated: true }),
              100
            );
          }
        });

        socketRef.current.on("userTyping", ({ userId, isTyping: typing }) => {
          if (userId === otherUser._id) {
            setIsTyping(typing);
          }
        });

        socketRef.current.on("userOnlineStatus", ({ userId, isOnline: online }) => {
          if (userId === otherUser._id) {
            setIsOnline(online);
          }
        });

        socketRef.current.on("messageDelivered", ({ messageId }) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === messageId
                ? { ...msg, isDelivered: true, status: "delivered" }
                : msg
            )
          );
        });

        socketRef.current.on("messagesRead", ({ messageIds, readBy, conversationId }) => {
          console.log(`✓✓ Messages read by ${readBy}:`, messageIds);

          setMessages((prev) =>
            prev.map((msg) =>
              messageIds.includes(msg._id)
                ? { ...msg, isRead: true, status: "read" }
                : msg
            )
          );
        });

        socketRef.current.on("messageRead", ({ conversationId, messageIds }) => {
          console.log("✓✓ Receiver marked messages as read");

          setMessages((prev) =>
            prev.map((msg) => {
              if (messageIds.includes(msg._id)) {
                return {
                  ...msg,
                  isRead: true,
                  status: "read",
                  readAt: new Date().toISOString(),
                };
              }
              return msg;
            })
          );
        });

        socketRef.current.on("messageDeleted", ({ messageId, conversationId }) => {
          if (conversationId !== conversation._id) return;
          console.log("🗑️ Message deleted (real-time):", messageId);

          LayoutAnimation.configureNext(ANIMATION_CONFIG);
          messageIdsRef.current.delete(messageId);
          setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
        });

        socketRef.current.on("inquiryClosed", ({ conversationId, closedBy }) => {
          if (conversationId === conversation._id) {
            setInquiryStatus("closed");
            setInquiryClosedAt(new Date());
            setInquiryClosedBy(closedBy);
          }
        });

        socketRef.current.on("incomingCall", ({ callerId, callerName, callType, conversationId }) => {
          Alert.alert("Incoming Call", `${callerName} is calling you`, [
            {
              text: "Decline",
              onPress: () =>
                socketRef.current.emit("callResponse", {
                  conversationId,
                  callerId,
                  accepted: false,
                }),
              style: "cancel",
            },
            {
              text: "Accept",
              onPress: () =>
                socketRef.current.emit("callResponse", {
                  conversationId,
                  callerId,
                  accepted: true,
                }),
            },
          ]);
        });

        socketRef.current.on("callResponse", ({ accepted }) => {
          Alert.alert(
            "Call Response",
            accepted ? "Call accepted!" : "Call declined",
            [{ text: "OK" }]
          );
        });

        socketRef.current.on("callEnded", () => {
          Alert.alert("Call Ended", "The call has ended", [{ text: "OK" }]);
        });
      } catch (error) {
        console.error("Socket initialization error:", error);
      }
    };

    if (user && userDetails) {
      initSocket();
      fetchMessages();
      setupNavigation();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leaveConversation", conversation._id);
        socketRef.current.disconnect();
      }
    };
  }, [user, userDetails]);

  // Typing indicator
  useEffect(() => {
    if (newMessage.trim() && socketRef.current) {
      socketRef.current.emit("typing", {
        conversationId: conversation._id,
        isTyping: true,
      });

      const timer = setTimeout(() => {
        socketRef.current?.emit("typing", {
          conversationId: conversation._id,
          isTyping: false,
        });
      }, 2000);

      return () => clearTimeout(timer);
    } else if (socketRef.current) {
      socketRef.current.emit("typing", {
        conversationId: conversation._id,
        isTyping: false,
      });
    }
  }, [newMessage]);

  const emitReadStatus = useCallback(async () => {
    const now = Date.now();
    if (now - lastReadEmit.current < 1000) return;
    lastReadEmit.current = now;

    try {
      const token = await user.getIdToken();
      const unreadMessages = messages
        .filter((msg) => !msg.isRead && msg.receiverId._id === currentUserId)
        .map((msg) => msg._id);

      if (unreadMessages.length === 0) return;

      const response = await fetch(
        `${API_URL}/api/messages/conversations/${conversation._id}/mark-read`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messageIds: unreadMessages }),
        }
      );

      const data = await response.json();

      if (response.ok && data.messageIds?.length > 0) {
        if (socketRef.current) {
          socketRef.current.emit("messageRead", {
            conversationId: conversation._id,
            messageIds: data.messageIds,
          });
        }

        setMessages((prev) =>
          prev.map((msg) =>
            data.messageIds.includes(msg._id)
              ? {
                  ...msg,
                  isRead: true,
                  status: "read",
                  readAt: new Date().toISOString(),
                }
              : msg
          )
        );
      }
    } catch (err) {
      console.error("Error marking read:", err);
    }
  }, [user, conversation._id, currentUserId, messages]);

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;

    const isAtBottom = distanceFromBottom < 50;

    if (isAtBottom) {
      isUserScrolling.current = false;
      setShowScrollButton(false);
      setNewMessagesCount(0);

      if (messages.length > 0) {
        const unreadMessages = messages
          .filter((msg) => !msg.isRead && msg.receiverId._id === currentUserId)
          .map((msg) => msg._id);

        if (unreadMessages.length > 0 && socketRef.current) {
          socketRef.current.emit("messageRead", {
            conversationId: conversation._id,
            messageIds: unreadMessages,
          });

          setMessages((prev) =>
            prev.map((msg) =>
              unreadMessages.includes(msg._id)
                ? { ...msg, isRead: true, status: "read" }
                : msg
            )
          );
        }
      }
    } else {
      isUserScrolling.current = true;
      setShowScrollButton(true);
    }
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setNewMessagesCount(0);
    setShowScrollButton(false);
    isUserScrolling.current = false;
    emitReadStatus();
  };

  const setupNavigation = () => {
    navigation.setOptions({
      title: "",
      headerStyle: {
        backgroundColor: "#FFFFFF",
        shadowColor: "transparent",
        elevation: 0,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
      },
      headerTintColor: "#1A1A1C",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#1A1A1C" />
          <View style={styles.headerAvatarContainer}>
            {otherUser.profilePictureUrl ? (
              <Image
                source={{ uri: otherUser.profilePictureUrl }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.headerPlaceholderAvatar}>
                <Text style={styles.headerPlaceholderText}>
                  {otherUser.username?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            {isOnline && <View style={styles.headerOnlineDot} />}
          </View>
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerUserName} numberOfLines={1}>
              {otherUser.username}
            </Text>
            <Text style={styles.headerUserStatus}>
              {isTyping ? (
                <View style={styles.typingIndicatorHeader}>
                  <Text style={styles.typingTextHeader}>typing</Text>
                  <View style={styles.typingDotsHeader}>
                    <View style={styles.typingDotHeader} />
                    <View style={styles.typingDotHeader} />
                    <View style={styles.typingDotHeader} />
                  </View>
                </View>
              ) : isOnline ? (
                "Online"
              ) : (
                "Offline"
              )}
            </Text>
          </View>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleVoiceCall}
            style={styles.headerIconButton}
            activeOpacity={0.7}
          >
            <View style={styles.headerIconWrapper}>
              <MaterialCommunityIcons name="phone" size={20} color="#2F6F61" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleMore}
            style={styles.headerIconButton}
            activeOpacity={0.7}
          >
            <View style={styles.headerIconWrapper}>
              <MaterialCommunityIcons name="dots-vertical" size={20} color="#2F6F61" />
            </View>
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
        messageIdsRef.current.clear();
        data.messages.forEach((msg) => messageIdsRef.current.add(msg._id));

        setMessages(data.messages || []);

        if (isInitialLoad.current && data.messages?.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
            isInitialLoad.current = false;
            emitReadStatus();
          }, 300);
        }
      } else {
        console.error("Error fetching messages:", data.error);
        Alert.alert("Error", "Failed to load messages");
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      setLoading(false);
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
        ...(replyTo && { replyTo: replyTo._id }),
        ...(conversation.product && { productId: conversation.product._id }),
      };

      const response = await fetch(`${API_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messagePayload),
      });

      const data = await response.json();
      if (response.ok) {
        messageIdsRef.current.add(data.message._id);

        LayoutAnimation.configureNext(ANIMATION_CONFIG);

        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) {
            console.log("⚠️ Duplicate prevented in sendMessage");
            return prev;
          }
          return [...prev, data.message];
        });
        setNewMessage("");
        setReplyTo(null);
        setInputHeight(40);

        if (socketRef.current) {
          socketRef.current.emit("sendMessage", {
            conversationId: conversation._id,
            message: data.message,
          });
        }

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          isUserScrolling.current = false;
          setShowScrollButton(false);
        }, 100);
      } else {
        Alert.alert("Error", data.error || "Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleSendText = () => {
    if (!newMessage.trim()) return;
    sendMessage({ content: newMessage.trim(), messageType: "text" });
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo access");
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
      console.error("Image pick error:", err);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadAndSendImage = async (uri) => {
    try {
      setSending(true);
      const token = await user.getIdToken();

      const response = await fetch(uri);
      const blob = await response.blob();

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result;

          const uploadResponse = await fetch(
            `${API_URL}/api/messages/upload-image`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ image: base64 }),
            }
          );

          const uploadData = await uploadResponse.json();

          if (uploadResponse.ok && uploadData.imageUrl) {
            sendMessage({
              messageType: "image",
              imageUrl: uploadData.imageUrl,
              content: "📷 Image",
            });
          } else {
            throw new Error(uploadData.error || "Upload failed");
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          Alert.alert("Error", "Failed to upload image. Please try again.");
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Image processing error:", err);
      Alert.alert("Error", "Failed to process image.");
    } finally {
      setSending(false);
    }
  };

  // Update the handleVoiceCall and socket listeners in ChatScreen.js

// Replace the handleVoiceCall function with this:
// In ChatScreen.js, update these functions:

const handleVoiceCall = () => {
  Alert.alert(
    "Start Call",
    `Call ${otherUser.username}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Voice Call",
        onPress: () => {
          navigation.navigate("Call", {
            otherUser,
            conversation,
            callType: "voice",
            isOutgoing: true,
          });
        },
      },
      {
        text: "Video Call",
        onPress: () => {
          navigation.navigate("Call", {
            otherUser,
            conversation,
            callType: "video",
            isOutgoing: true,
          });
        },
      },
    ]
  );
};

// Update the incoming call socket listener:
socketRef.current.on("incomingCall", ({ callerId, callerName, callType, conversationId, offer }) => {
  Alert.alert(
    "Incoming Call",
    `${callerName} is calling you`,
    [
      {
        text: "Decline",
        onPress: () => {
          if (socketRef.current) {
            socketRef.current.emit("rejectCall", {
              to: callerId,
              conversationId,
            });
          }
        },
        style: "cancel",
      },
      {
        text: "Answer",
        onPress: () => {
          navigation.navigate("Call", {
            otherUser: {
              _id: callerId,
              username: callerName,
              profilePictureUrl: otherUser.profilePictureUrl,
            },
            conversation: { _id: conversationId },
            callType,
            isOutgoing: false,
            offer,
          });
        },
      },
    ],
    { cancelable: false }
  );
});

// Update the socket listener for incoming calls:
socketRef.current.on("incomingCall", ({ callerId, callerName, callType, conversationId, offer }) => {
  // Show incoming call notification
  Alert.alert(
    "Incoming Call",
    `${callerName} is calling you`,
    [
      {
        text: "Decline",
        onPress: () => {
          if (socketRef.current) {
            socketRef.current.emit("rejectCall", {
              to: callerId,
              conversationId,
            });
          }
        },
        style: "cancel",
      },
      {
        text: "Answer",
        onPress: () => {
          // Navigate to call screen
          navigation.navigate("Call", {
            otherUser: {
              _id: callerId,
              username: callerName,
              profilePictureUrl: otherUser.profilePictureUrl,
            },
            conversation: { _id: conversationId },
            callType,
            isOutgoing: false,
            offer, // Pass the offer for answering
          });
        },
      },
    ],
    { cancelable: false }
  );
});

  const handleMore = () => {
    const options = [
      { text: "View Profile", onPress: () => {} },
      { text: "Clear Chat", onPress: clearChat, style: "destructive" },
      { text: "Block User", onPress: blockUser, style: "destructive" },
    ];

    if (inquiryStatus === "active" && conversation.product) {
      options.unshift({
        text: "Close Inquiry",
        onPress: closeInquiry,
        style: "default",
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Chat Options", "", options);
  };

  const closeInquiry = () => {
    Alert.alert(
      "Close Inquiry",
      "Are you sure you want to close this product inquiry? You can start a new inquiry for other products later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Inquiry",
          onPress: async () => {
            try {
              const token = await user.getIdToken();
              const response = await fetch(
                `${API_URL}/api/messages/conversations/${conversation._id}/close-inquiry`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              const data = await response.json();

              if (response.ok) {
                setInquiryStatus("closed");
                setInquiryClosedAt(new Date());
                setInquiryClosedBy(currentUserId);

                if (socketRef.current) {
                  socketRef.current.emit("inquiryClosed", {
                    conversationId: conversation._id,
                    closedBy: currentUserId,
                  });
                }

                Alert.alert("Success", "Inquiry closed successfully");

                sendMessage({
                  messageType: "text",
                  content: "🔒 Product inquiry has been closed",
                });
              } else {
                Alert.alert("Error", data.error || "Failed to close inquiry");
              }
            } catch (err) {
              console.error("Error closing inquiry:", err);
              Alert.alert("Error", "Failed to close inquiry");
            }
          },
        },
      ]
    );
  };

  const clearChat = () => {
    Alert.alert("Clear Chat", "Are you sure you want to clear all messages?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await user.getIdToken();
            const response = await fetch(
              `${API_URL}/api/messages/conversations/${conversation._id}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (response.ok) {
              LayoutAnimation.configureNext(ANIMATION_CONFIG);
              messageIdsRef.current.clear();
              setMessages([]);
              Alert.alert("Success", "Chat cleared successfully");
            } else {
              const data = await response.json();
              Alert.alert("Error", data.error || "Failed to clear chat");
            }
          } catch (err) {
            console.error("Error clearing chat:", err);
            Alert.alert("Error", "Failed to clear chat");
          }
        },
      },
    ]);
  };

  const deleteMessage = async (messageId) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              LayoutAnimation.configureNext(ANIMATION_CONFIG);
              
              messageIdsRef.current.delete(messageId);
              setMessages((prev) => prev.filter((msg) => msg._id !== messageId));

              if (socketRef.current) {
                socketRef.current.emit("deleteMessage", {
                  messageId,
                  conversationId: conversation._id,
                });
              }

              console.log("✅ Message deleted and synced");
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert("Error", "Failed to delete message");
            }
          },
        },
      ]
    );
  };

  const blockUser = () => {
    Alert.alert(
      "Block User",
      `Block ${otherUser.username}? You won't receive messages from them.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: () => {} },
      ]
    );
  };

  const shareProduct = () => {
    if (conversation.product) {
      sendMessage({
        messageType: "product",
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
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  const groupMessagesByDate = (messagesArray) => {
    const grouped = {};

    messagesArray.forEach((message) => {
      const date = new Date(message.sentDate).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  };

  const renderDateHeader = (date) => (
    <View style={styles.dateHeader}>
      <View style={styles.dateHeaderBadge}>
        <MaterialCommunityIcons name="calendar-blank" size={14} color="#2F6F61" />
        <Text style={styles.dateHeaderText}>{formatDateHeader(date)}</Text>
      </View>
    </View>
  );

  const renderReplySection = () => {
    if (!replyTo) return null;

    return (
      <Animated.View style={styles.replyContainer}>
        <View style={styles.replyHeader}>
          <MaterialCommunityIcons name="reply" size={18} color="#2F6F61" />
          <Text style={styles.replyLabel}>
            Replying to{" "}
            {replyTo.senderId._id === currentUserId
              ? "yourself"
              : otherUser.username}
          </Text>
        </View>
        <View style={styles.replyContent}>
          {replyTo.messageType === "image" && replyTo.imageUrl ? (
            <View style={styles.replyImagePreview}>
              <Image
                source={{ uri: replyTo.imageUrl }}
                style={styles.replyImage}
              />
              <Text style={styles.replyText}>📷 Photo</Text>
            </View>
          ) : (
            <Text style={styles.replyText} numberOfLines={2}>
              {replyTo.messageType === "product"
                ? "🛍️ Product"
                : replyTo.content}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setReplyTo(null)}
          style={styles.replyClose}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close" size={18} color="#8E8E93" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const SwipeToReply = ({ children, onReply }) => {
    const translateX = useRef(new Animated.Value(0)).current;

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        const { translationX } = event.nativeEvent;
        const threshold = 80;

        if (Math.abs(translationX) > threshold) {
          onReply();
          if (Platform.OS === "android") {
            Vibration.vibrate(30);
          }
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    };

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View style={{ transform: [{ translateX }] }}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId._id === currentUserId;

    return (
      <SwipeToReply onReply={() => setReplyTo(item)}>
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <View style={styles.messageWrapper}>
            {item.replyTo && (
              <TouchableOpacity
                style={[
                  styles.replyPreview,
                  isMyMessage
                    ? styles.myReplyPreview
                    : styles.otherReplyPreview,
                ]}
                onPress={() => {
                  const repliedIndex = messages.findIndex(
                    (m) => m._id === item.replyTo.messageId
                  );
                  if (repliedIndex !== -1) {
                    flatListRef.current?.scrollToIndex({
                      index: repliedIndex,
                      animated: true,
                      viewPosition: 0.5,
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.replyPreviewBar,
                    isMyMessage ? styles.myReplyBar : styles.otherReplyBar,
                  ]}
                />
                <View style={styles.replyPreviewContent}>
                  <Text
                    style={[
                      styles.replyPreviewName,
                      isMyMessage ? styles.myReplyName : styles.otherReplyName,
                    ]}
                  >
                    {item.replyTo.senderId._id === currentUserId
                      ? "You"
                      : otherUser.username}
                  </Text>
                  <Text
                    style={[
                      styles.replyPreviewText,
                      isMyMessage ? styles.myReplyText : styles.otherReplyText,
                    ]}
                    numberOfLines={2}
                  >
                    {item.replyTo.messageType === "image"
                      ? "📷 Photo"
                      : item.replyTo.messageType === "product"
                      ? "🛍️ Product"
                      : item.replyTo.content}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <Pressable
              style={[
                styles.messageBubble,
                isMyMessage
                  ? styles.myMessageBubble
                  : styles.otherMessageBubble,
              ]}
              onLongPress={() => {
                setSelectedMessageForAction(item);
                setShowActionsModal(true);
              }}
              delayLongPress={300}
            >
              {item.messageType === "text" && (
                <Text
                  style={[
                    styles.messageText,
                    isMyMessage
                      ? styles.myMessageText
                      : styles.otherMessageText,
                  ]}
                >
                  {item.content}
                </Text>
              )}

              {item.messageType === "image" && item.imageUrl && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(item.imageUrl);
                    setImageModalVisible(true);
                  }}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.messageImage}
                  />
                  <View style={styles.imageOverlay}>
                    <MaterialCommunityIcons
                      name="magnify-plus"
                      size={24}
                      color="white"
                    />
                  </View>
                </TouchableOpacity>
              )}

              {item.messageType === "product" && item.sharedProduct && (
                <TouchableOpacity
                  style={styles.productMessage}
                  onPress={() => {
                    if (item.sharedProduct.productId) {
                      navigation.navigate("ProductDetails", {
                        product: {
                          _id: item.sharedProduct.productId,
                          title: item.sharedProduct.productTitle,
                          price: item.sharedProduct.productPrice,
                          imagesUrls: [item.sharedProduct.productImage],
                        },
                      });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: item.sharedProduct.productImage }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <View style={styles.productBadge}>
                      <MaterialCommunityIcons name="shopping" size={12} color="#2F6F61" />
                      <Text style={styles.productBadgeText}>Product</Text>
                    </View>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {item.sharedProduct.productTitle}
                    </Text>
                    <Text style={styles.productPrice}>
                      LKR {item.sharedProduct.productPrice?.toLocaleString()}
                    </Text>
                    <View style={styles.productAction}>
                      <Text style={styles.productLabel}>Tap to view</Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={14}
                        color={isMyMessage ? "#FFFFFF" : "#2F6F61"}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {item.messageType === "call" && (
                <View style={styles.callMessage}>
                  <View style={styles.callIconContainer}>
                    <MaterialCommunityIcons
                      name={item.callType === "video" ? "video" : "phone"}
                      size={18}
                      color={isMyMessage ? "#fff" : "#2F6F61"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.callText,
                      isMyMessage
                        ? styles.myMessageText
                        : styles.otherMessageText,
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
              )}
            </Pressable>

            <View
              style={[
                styles.messageMeta,
                isMyMessage ? styles.myMessageMeta : styles.otherMessageMeta,
              ]}
            >
              <Text style={styles.messageTime}>
                {formatMessageTime(item.sentDate)}
              </Text>
              {isMyMessage && (
                <View style={styles.statusContainer}>
                  {item.status === "read" && (
                    <>
                      <MaterialCommunityIcons
                        name="check-all"
                        size={16}
                        color="#34C759"
                      />
                      <Text style={[styles.messageStatus, styles.readStatus]}>
                        Read
                      </Text>
                    </>
                  )}
                  {item.status === "delivered" && (
                    <>
                      <MaterialCommunityIcons
                        name="check-all"
                        size={16}
                        color="#8E8E93"
                      />
                      <Text style={styles.messageStatus}>Delivered</Text>
                    </>
                  )}
                  {item.status === "sent" && (
                    <>
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color="#8E8E93"
                      />
                      <Text style={styles.messageStatus}>Sent</Text>
                    </>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </SwipeToReply>
    );
  };

  const groupedMessages = groupMessagesByDate(messages);
  const flattenedData = Object.entries(groupedMessages).map(([date, msgs]) => ({
    date,
    messages: msgs,
  }));

  const renderItem = ({ item: dateGroup }) => (
    <View key={dateGroup.date}>
      {renderDateHeader(dateGroup.date)}
      {dateGroup.messages.map((message) => (
        <View key={message._id}>{renderMessage({ item: message })}</View>
      ))}
    </View>
  );

  const shouldShowProductHeader =
    inquiryStatus === "active" && conversation.product;
  const shouldShowClosedBanner = inquiryStatus === "closed" && inquiryClosedAt;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      {!isConnected && (
        <View style={styles.connectionBanner}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.connectionText}>Connecting...</Text>
        </View>
      )}

      {shouldShowClosedBanner && (
        <View style={styles.closedBanner}>
          <View style={styles.closedBannerIcon}>
            <MaterialCommunityIcons name="lock" size={16} color="#666" />
          </View>
          <Text style={styles.closedBannerText}>
            Inquiry closed • You can start a new inquiry for other products
          </Text>
        </View>
      )}

      {shouldShowProductHeader && (
        <View style={styles.productHeader}>
          <TouchableOpacity
            style={styles.productHeaderContent}
            onPress={() => {
              navigation.navigate("ProductDetails", {
                product: conversation.product,
              });
            }}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: conversation.product.imagesUrls?.[0] }}
              style={styles.headerProductImage}
            />
            <View style={styles.headerProductInfo}>
              <View style={styles.productHeaderBadge}>
                <MaterialCommunityIcons name="shopping" size={12} color="#2F6F61" />
                <Text style={styles.productHeaderBadgeText}>Product Inquiry</Text>
              </View>
              <Text style={styles.headerProductTitle} numberOfLines={1}>
                {conversation.product.title}
              </Text>
              <Text style={styles.headerProductPrice}>
                LKR {conversation.product.price?.toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={shareProduct}
              style={styles.productActionButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="share-variant"
                size={18}
                color="#2F6F61"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={closeInquiry}
              style={[styles.productActionButton, styles.closeProductButton]}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={flattenedData}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons
                  name="message-outline"
                  size={64}
                  color="#2F6F61"
                />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Start the conversation by sending a message
              </Text>
            </View>
          )
        }
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6F61" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      )}

      {showScrollButton && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons
            name="chevron-down"
            size={24}
            color="#FFFFFF"
          />
          {newMessagesCount > 0 && (
            <View style={styles.newMessagesBadge}>
              <Text style={styles.newMessagesText}>
                {newMessagesCount > 99 ? "99+" : newMessagesCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {renderReplySection()}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          onPress={handleImagePicker}
          style={styles.attachButton}
          disabled={sending}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="image" size={22} color="#2F6F61" />
        </TouchableOpacity>

        <View style={styles.textInputWrapper}>
          <TextInput
            style={[styles.textInput, { height: Math.max(40, inputHeight) }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={1000}
            editable={!sending}
            onContentSizeChange={(event) => {
              setInputHeight(
                Math.min(100, event.nativeEvent.contentSize.height)
              );
            }}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendText}
          disabled={!newMessage.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.imageModalBackdrop}
            onPress={() => setImageModalVisible(false)}
          >
            <Image source={{ uri: selectedImage }} style={styles.fullImage} />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setImageModalVisible(false)}
              activeOpacity={0.8}
            >
              <View style={styles.modalCloseIcon}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Modal>

      <MessageActionsModal
        visible={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        message={selectedMessageForAction}
        isMyMessage={selectedMessageForAction?.senderId._id === currentUserId}
        onReply={() => setReplyTo(selectedMessageForAction)}
        onCopy={() => {
          if (selectedMessageForAction?.content) {
            Alert.alert("Copied", "Message copied to clipboard");
          }
        }}
        onDelete={() => deleteMessage(selectedMessageForAction?._id)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  connectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFA726",
    paddingVertical: 8,
    gap: 10,
  },
  connectionText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  closedBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  closedBannerText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  headerAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
  },
  headerPlaceholderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2F6F61",
    justifyContent: "center",
    alignItems: "center",
  },
  headerPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerUserInfo: {
    justifyContent: "center",
    maxWidth: width * 0.4,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1C",
  },
  headerUserStatus: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
    fontWeight: "500",
  },
  typingIndicatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingTextHeader: {
    fontSize: 12,
    color: "#2F6F61",
    fontWeight: "600",
  },
  typingDotsHeader: {
    flexDirection: "row",
    gap: 2,
  },
  typingDotHeader: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#2F6F61",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 12,
  },
  headerIconButton: {
    padding: 4,
  },
  headerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F7F6",
    justifyContent: "center",
    alignItems: "center",
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  productHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerProductImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: "#F0F0F0",
  },
  headerProductInfo: {
    flex: 1,
  },
  productHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(47, 111, 97, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
    marginBottom: 6,
  },
  productHeaderBadgeText: {
    fontSize: 11,
    color: "#2F6F61",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerProductTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1C",
    marginBottom: 4,
  },
  headerProductPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2F6F61",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F7F5",
    justifyContent: "center",
    alignItems: "center",
  },
  closeProductButton: {
    backgroundColor: "#FFF5F5",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  dateHeader: {
    alignItems: "center",
    marginVertical: 20,
  },
  dateHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dateHeaderText: {
    fontSize: 13,
    color: "#2F6F61",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  messageContainer: {
    marginVertical: 3,
    width: "100%",
  },
  myMessage: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
    marginLeft: "20%",
  },
  otherMessage: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    marginRight: "20%",
  },
  messageWrapper: {
    maxWidth: "100%",
  },
  messageBubble: {
    padding: 14,
    borderRadius: 20,
    marginBottom: 4,
  },
  myMessageBubble: {
    backgroundColor: "#2F6F61",
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#1A1A1C",
  },
  messageMeta: {
    flexDirection: "row",
    marginTop: 4,
    alignItems: "center",
    gap: 6,
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
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  messageStatus: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "600",
  },
  readStatus: {
    color: "#34C759",
  },
  messageImage: {
    width: 220,
    height: 165,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  productMessage: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
    width: 240,
    gap: 12,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  productBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  productBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2F6F61",
    textTransform: "uppercase",
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "inherit",
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "inherit",
    marginBottom: 4,
  },
  productAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  productLabel: {
    fontSize: 11,
    color: "inherit",
    opacity: 0.9,
    fontWeight: "600",
  },
  callMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  callIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  callText: {
    fontSize: 15,
    fontWeight: "600",
  },
  replyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#2F6F61",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  replyLabel: {
    fontSize: 13,
    color: "#2F6F61",
    fontWeight: "700",
  },
  replyContent: {
    flex: 1,
    marginRight: 12,
  },
  replyImagePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  replyImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  replyText: {
    fontSize: 14,
    color: "#1A1A1C",
    fontStyle: "italic",
    lineHeight: 20,
    flex: 1,
  },
  replyClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7F6",
  },
  replyPreview: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    maxWidth: "90%",
  },
  myReplyPreview: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderLeftColor: "#FFFFFF",
  },
  otherReplyPreview: {
    backgroundColor: "rgba(47,111,97,0.08)",
    borderLeftColor: "#2F6F61",
  },
  replyPreviewBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 10,
  },
  myReplyBar: {
    backgroundColor: "#FFFFFF",
  },
  otherReplyBar: {
    backgroundColor: "#2F6F61",
  },
  replyPreviewContent: {
    flex: 1,
    maxWidth: 200,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  myReplyName: {
    color: "rgba(255,255,255,0.95)",
  },
  otherReplyName: {
    color: "#2F6F61",
  },
  replyPreviewText: {
    fontSize: 12,
    lineHeight: 16,
  },
  myReplyText: {
    color: "rgba(255,255,255,0.85)",
  },
  otherReplyText: {
    color: "#8E8E93",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 10,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 2,
    backgroundColor: "#F5F7F6",
    justifyContent: "center",
    alignItems: "center",
  },
  textInputWrapper: {
    flex: 1,
  },
  textInput: {
    backgroundColor: "#F5F7F6",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    lineHeight: 20,
    borderWidth: 1.5,
    borderColor: "transparent",
    color: "#1A1A1C",
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: "#2F6F61",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
    shadowColor: "#2F6F61",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#C8C8C8",
    shadowOpacity: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 120,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(47, 111, 97, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1C",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "600",
  },
  scrollToBottomButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#2F6F61",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2F6F61",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  newMessagesBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  newMessagesText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalBackdrop: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: width * 0.95,
    height: height * 0.8,
    resizeMode: "contain",
    borderRadius: 16,
  },
  modalCloseButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 20,
  },
  modalCloseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  actionsModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D1D6",
    alignSelf: "center",
    marginBottom: 20,
  },
  actionsModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1C",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F8F8F8",
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
});