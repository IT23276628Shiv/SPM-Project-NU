// components/MessageBubble.js
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const MessageBubble = ({ message, currentUser, userData }) => {
  const isCurrentUser = message.senderId === currentUser;

  // Default avatar if none provided
  const defaultAvatar = 'https://via.placeholder.com/150'; // Placeholder image
  const avatar = userData[message.senderId]?.avatar || defaultAvatar;

  return (
    <View
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
    >
      {!isCurrentUser && (
        <Image source={{ uri: avatar }} style={styles.messageAvatar} />
      )}

      <View
        style={[
          styles.bubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}
      >
        {!isCurrentUser && userData[message.senderId]?.name && (
          <Text style={styles.senderName}>{userData[message.senderId].name}</Text>
        )}
        <Text
          style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText,
          ]}
        >
          {message.content}
        </Text>
        <Text
          style={[
            styles.timestamp,
            isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp,
          ]}
        >
          {new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {isCurrentUser && (
        <Image source={{ uri: avatar }} style={styles.messageAvatar} />
      )}
    </View>
  );
};

// Styles (same as in ChatScreen.js, second version)
const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  bubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: '#5E8B7E',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E8B7E',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#2F5D62',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  currentUserTimestamp: {
    color: '#D6E8E1',
  },
  otherUserTimestamp: {
    color: '#8AA399',
  },
});

export default MessageBubble;