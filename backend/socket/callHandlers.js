// backend/socket/callHandlers.js - WebRTC Call Handlers (ES6 Module)
import Message from '../models/message.js';
import Conversation from '../models/Conversation.js';

export function initializeCallHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`📞 Call socket connected: ${socket.id} | User: ${socket.userId}`);

    // Handle outgoing call
    socket.on('callUser', async ({ offer, to, from, callType, conversationId, callerName }) => {
      console.log(`📞 Outgoing call: ${from} → ${to} (${callType})`);

      // Store call data in socket
      socket.callData = {
        from,
        to,
        conversationId,
        callType,
        startTime: new Date(),
      };

      // Find recipient's socket
      const recipientSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.userId === to
      );

      if (recipientSocket) {
        // Send call notification to recipient
        recipientSocket.emit('incomingCall', {
          callerId: from,
          callerName,
          callType,
          conversationId,
          offer,
        });
        console.log(`✅ Call offer sent to ${to}`);
      } else {
        // User is offline
        console.log(`❌ User ${to} is offline`);
        socket.emit('callFailed', {
          reason: 'User is offline',
        });

        // Save missed call message
        try {
          await saveMissedCall(conversationId, from, to, callType);
        } catch (error) {
          console.error('Error saving missed call:', error);
        }
      }
    });

    // Handle call answer
    socket.on('answerCall', async ({ answer, to, conversationId }) => {
      console.log(`✅ Call answered in conversation: ${conversationId}`);

      // Find caller's socket
      const callerSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.userId === to
      );

      if (callerSocket) {
        callerSocket.emit('callAnswered', {
          answer,
          from: socket.userId,
        });
        console.log(`📞 Call answer sent to ${to}`);
      } else {
        console.log(`⚠️ Caller ${to} not found`);
      }
    });

    // Handle ICE candidates exchange
    socket.on('iceCandidate', ({ candidate, to, conversationId }) => {
      const recipientSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.userId === to
      );

      if (recipientSocket) {
        recipientSocket.emit('iceCandidate', {
          candidate,
          from: socket.userId,
        });
      }
    });

    // Handle call rejection
    socket.on('rejectCall', async ({ to, conversationId }) => {
      console.log(`❌ Call rejected by user: ${socket.userId}`);

      const callerSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.userId === to
      );

      if (callerSocket) {
        callerSocket.emit('callRejected', {
          from: socket.userId,
        });
      }

      // Save missed call message
      try {
        await saveMissedCall(
          conversationId, 
          to, 
          socket.userId, 
          socket.callData?.callType || 'voice'
        );
      } catch (error) {
        console.error('Error saving rejected call:', error);
      }
    });

    // Handle call end
    socket.on('endCall', async ({ to, conversationId, duration }) => {
      console.log(`📴 Call ended. Duration: ${duration}s`);

      const otherSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.userId === to
      );

      if (otherSocket) {
        otherSocket.emit('callEnded', {
          from: socket.userId,
          duration,
        });
      }

      // Save call message with duration
      try {
        const callData = socket.callData || {};
        const formattedDuration = formatDuration(duration);

        const message = new Message({
          conversationId,
          senderId: socket.userId,
          receiverId: to,
          content: `📞 ${callData.callType === 'video' ? 'Video' : 'Voice'} call • ${formattedDuration}`,
          messageType: 'call',
          callType: callData.callType || 'voice',
          callDuration: duration,
          sentDate: new Date(),
        });

        await message.save();
        await message.populate('senderId receiverId', 'username profilePictureUrl');

        // Update conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
        });

        // Emit message to both users
        io.to(conversationId).emit('newMessage', message);
        
        console.log(`✅ Call message saved: ${formattedDuration}`);
      } catch (error) {
        console.error('Error saving call message:', error);
      }

      // Clear call data
      delete socket.callData;
    });

    // Handle disconnect during call
    socket.on('disconnect', async () => {
      if (socket.callData) {
        const { to, conversationId, callType } = socket.callData;
        
        console.log(`📴 User disconnected during call: ${socket.userId}`);

        const otherSocket = Array.from(io.sockets.sockets.values()).find(
          (s) => s.userId === to
        );

        if (otherSocket) {
          otherSocket.emit('callEnded', {
            from: socket.userId,
            reason: 'User disconnected',
          });
        }

        // Save interrupted call message
        try {
          await saveMissedCall(conversationId, socket.userId, to, callType);
        } catch (error) {
          console.error('Error saving disconnected call:', error);
        }
      }
    });
  });

  console.log('📞 WebRTC call handlers initialized');
}

// Helper function to save missed/rejected call
async function saveMissedCall(conversationId, senderId, receiverId, callType) {
  try {
    const message = new Message({
      conversationId,
      senderId,
      receiverId,
      content: `📞 Missed ${callType === 'video' ? 'video' : 'voice'} call`,
      messageType: 'call',
      callType: callType || 'voice',
      callDuration: 0,
      sentDate: new Date(),
    });

    await message.save();
    await message.populate('senderId receiverId', 'username profilePictureUrl');

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    console.log(`✅ Missed call message saved`);
    return message;
  } catch (error) {
    console.error('Error saving missed call:', error);
    throw error;
  }
}

// Helper function to format call duration
function formatDuration(seconds) {
  if (!seconds || seconds < 1) {
    return '0s';
  }
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  
  if (remainingMins > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  
  return `${hours}h`;
}