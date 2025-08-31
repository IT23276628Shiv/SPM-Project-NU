import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  Image,
  Animated,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { socket } from "../../api/socket";
import { sendMessageAPI, getMessagesAPI } from "../../api/message";

// Hardcoded for test
const currentUser = "68a19199878d7b499e4be874"; // sender
const otherUser = "66a1919987d7b499e4be874a";  // receiver
const productId = "66a191fc887d7b499e4be876";  // product

// Mock user data for demonstration
const userData = {
  "66a1919987d7b499e4be874a": {
    name: "niru",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
    phoneNumber: "1234567890",
  },
  "68a19199878d7b499e4be874": {
    name: "Alex Johnson",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    phoneNumber: "9876543210",
  },
};

// MessageBubble Component
const MessageBubble = ({ message, currentUser, userData }) => {
  const isCurrentUser = message.senderId === currentUser;
  
  return (
    <View style={[
      styles.messageContainer,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
    ]}>
      {!isCurrentUser && (
        <Image
          source={{ uri: userData[message.senderId]?.avatar }}
          style={styles.messageAvatar}
        />
      )}
      
      <View style={[
        styles.bubble,
        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
      ]}>
        {!isCurrentUser && (
          <Text style={styles.senderName}>
            {userData[message.senderId]?.name}
          </Text>
        )}
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserText : styles.otherUserText
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.timestamp,
          isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
        ]}>
          {new Date(message.createdAt || Date.now()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
      
      {isCurrentUser && (
        <Image
          source={{ uri: userData[message.senderId]?.avatar }}
          style={styles.messageAvatar}
        />
      )}
    </View>
  );
};

export default function ChatScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Debug socket connection
    socket.on("connect", () => console.log("Socket connected for", currentUser));
    socket.on("disconnect", () => console.log("Socket disconnected for", currentUser));
    socket.on("connect_error", (err) => console.log("Socket error:", err.message));

    socket.emit("join", currentUser);
    fetchMessages();

    const handleReceiveMessage = (msg) => {
      console.log("Received message:", msg);
      if (
        (msg.senderId === otherUser && msg.receiverId === currentUser) ||
        (msg.senderId === currentUser && msg.receiverId === otherUser)
      ) {
        setMessages((prev) => [...prev, msg]); // Append new message
        scrollToBottom();
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);

    socket.on("typing", ({ senderId }) => {
      if (senderId === otherUser) {
        setIsTyping(true);
        startTypingAnimation();
      }
    });

    socket.on("stopTyping", ({ senderId }) => {
      if (senderId === otherUser) {
        setIsTyping(false);
        stopTypingAnimation();
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, []);

  const startTypingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopTypingAnimation = () => {
    typingAnimation.setValue(0);
  };

  const fetchMessages = async () => {
    try {
      const msgs = await getMessagesAPI(currentUser, otherUser);
      console.log("Fetched messages:", msgs);
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleCall = () => {
    const phoneNumber = userData[otherUser]?.phoneNumber;
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert("Error", "Phone number not available for this user");
    }
  };

  const handleAttachment = () => {
    Alert.alert(
      "Coming Soon",
      "Image sharing feature will be available in the next update",
      [{ text: "OK" }]
    );
  };

  const handleVoiceMessage = () => {
    Alert.alert(
      "Coming Soon",
      "Voice message feature will be available in the next update",
      [{ text: "OK" }]
    );
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    const msg = {
      senderId: currentUser,
      receiverId: otherUser,
      productId,
      content: text,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
    setText("");

    try {
      socket.emit("sendMessage", msg);
      const saved = await sendMessageAPI(msg);
      // Update with server response (e.g., _id)
      setMessages((prev) => prev.map((m) => (m.content === msg.content && !m._id ? saved : m)));
    } catch (err) {
      console.error("Failed to send message", err);
      setMessages((prev) => prev.filter((m) => m.content !== msg.content)); // Rollback
      Alert.alert("Error", "Failed to send message");
    }

    socket.emit("stopTyping", { senderId: currentUser, receiverId: otherUser });
  };

  const handleTyping = (value) => {
    setText(value);
    if (value.trim()) {
      socket.emit("typing", { senderId: currentUser, receiverId: otherUser });
    } else {
      socket.emit("stopTyping", { senderId: currentUser, receiverId: otherUser });
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#1a3c2f" />
      </TouchableOpacity>
      
      <Image
        source={{ uri: userData[otherUser].avatar }}
        style={styles.avatar}
      />
      
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerName}>{userData[otherUser].name}</Text>
        <Text style={styles.headerStatus}>Online</Text>
      </View>
      
      <TouchableOpacity style={styles.headerButton} onPress={handleCall}>
        <Ionicons name="call" size={22} color="#1a3c2f" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="videocam" size={24} color="#1a3c2f" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#2e7d32" barStyle="light-content" />
      {renderHeader()}
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={({ item }) => (
            <MessageBubble 
              message={item} 
              currentUser={currentUser} 
              userData={userData}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        {isTyping && (
          <View style={styles.typingContainer}>
            <Animated.View style={[styles.typingDot, {
              opacity: typingAnimation,
              transform: [{
                translateY: typingAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5]
                })
              }]
            }]} />
            <Animated.View style={[styles.typingDot, {
              opacity: typingAnimation,
              transform: [{
                translateY: typingAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5]
                })
              }]
            }]} />
            <Animated.View style={[styles.typingDot, {
              opacity: typingAnimation,
              transform: [{
                translateY: typingAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5]
                })
              }]
            }]} />
            <Text style={styles.typingText}>is typing</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachmentButton} onPress={handleAttachment}>
            <Ionicons name="add" size={28} color="#1a3c2f" />
          </TouchableOpacity>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={handleTyping}
              placeholder="Type a message..."
              placeholderTextColor="#8aa399"
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.emojiButton} onPress={handleVoiceMessage}>
              <Ionicons name="mic" size={24} color="#1a3c2f" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#5E8B7E",
  },
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA" 
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#5E8B7E",
    borderBottomWidth: 1,
    borderBottomColor: "#4A7C6F",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  headerStatus: {
    fontSize: 14,
    color: "#D6E8E1",
  },
  headerButton: {
    padding: 8,
    marginLeft: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
  },
  list: { 
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  currentUserContainer: {
    justifyContent: "flex-end",
  },
  otherUserContainer: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  bubble: {
    maxWidth: "70%",
    padding: 12,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: "#5E8B7E",
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5E8B7E",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  currentUserText: {
    color: "#fff",
  },
  otherUserText: {
    color: "#2F5D62",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  currentUserTimestamp: {
    color: "#D6E8E1",
  },
  otherUserTimestamp: {
    color: "#8AA399",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#5E8B7E",
    marginHorizontal: 2,
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#5E8B7E",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E8E8E8",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 24,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    color: "#2F5D62",
    maxHeight: 100,
  },
  attachmentButton: {
    padding: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  emojiButton: {
    padding: 4,
  },
  sendButton: {
    padding: 12,
    backgroundColor: "#5E8B7E",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#A6C1B9",
  },
});