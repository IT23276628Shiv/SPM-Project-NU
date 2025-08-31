import express from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = express.Router();

// Move /user/:userId before /:user1/:user2 to avoid matching conflict
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("GET /api/messages/user/:userId - Received userId:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Validation failed: Invalid userId");
      return res.status(400).json({ error: "Invalid userId" });
    }

    const objectId = new mongoose.Types.ObjectId(userId);
    console.log("Converted to ObjectId:", objectId);

    const messages = await Message.find({
      $or: [{ senderId: objectId }, { receiverId: objectId }],
    }).sort({ createdAt: -1 }); // Use createdAt from timestamps

    const conversations = {};
    messages.forEach((msg) => {
      const otherUser = msg.senderId.toString() === userId ? msg.receiverId.toString() : msg.senderId.toString();
      if (!conversations[otherUser]) {
        conversations[otherUser] = {
          otherUser,
          productId: msg.productId,
          lastMessage: msg.content,
          timestamp: msg.createdAt,
          unreadCount: msg.isRead || msg.senderId.toString() === userId ? 0 : 1,
        };
      } else if (new Date(msg.createdAt) > new Date(conversations[otherUser].timestamp)) {
        conversations[otherUser].lastMessage = msg.content;
        conversations[otherUser].timestamp = msg.createdAt;
        conversations[otherUser].productId = msg.productId;
      } else if (!msg.isRead && msg.senderId.toString() !== userId) {
        conversations[otherUser].unreadCount += 1;
      }
    });
    console.log("Processed conversations:", Object.values(conversations));

    res.json(Object.values(conversations));
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations", details: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { senderId, receiverId, productId, content, attachmentUrl } = req.body;
    console.log("POST /api/messages - Received data:", { senderId, receiverId, productId, content, attachmentUrl });

    if (
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      console.log("Validation failed: Invalid senderId or receiverId");
      return res.status(400).json({ error: "Invalid senderId or receiverId" });
    }

    const message = new Message({
      senderId,
      receiverId,
      productId,
      content,
      attachmentUrl,
    });

    await message.save();
    console.log("Message saved successfully:", message._id);
    res.status(201).json(message);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

router.get("/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    console.log("GET /api/messages/:user1/:user2 - Params:", { user1, user2 });

    if (user1 === user2) {
      console.log("Validation failed: user1 and user2 are the same");
      return res.status(400).json({ error: "user1 and user2 cannot be the same" });
    }

    const messages = await Message.find({
      $or: [
        {
          senderId: new mongoose.Types.ObjectId(user1),
          receiverId: new mongoose.Types.ObjectId(user2),
        },
        {
          senderId: new mongoose.Types.ObjectId(user2),
          receiverId: new mongoose.Types.ObjectId(user1),
        },
      ],
    }).sort({ createdAt: 1 }); // Use createdAt

    console.log("Messages fetched:", messages.length, "records");
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!message) {
      console.log("Message not found for ID:", req.params.id);
      return res.status(404).json({ error: "Message not found" });
    }
    console.log("Message marked as read:", message._id);
    res.json(message);
  } catch (err) {
    console.error("Error marking message as read:", err);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
});

router.patch("/:user1/:user2/read", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    console.log("PATCH /api/messages/:user1/:user2/read - Params:", { user1, user2 });

    if (user1 === user2) {
      console.log("Validation failed: user1 and user2 are the same");
      return res.status(400).json({ error: "user1 and user2 cannot be the same" });
    }

    const updatedMessages = await Message.updateMany(
      {
        senderId: new mongoose.Types.ObjectId(user2),
        receiverId: new mongoose.Types.ObjectId(user1),
        isRead: false,
      },
      { isRead: true }
    );
    console.log("Messages marked as read:", updatedMessages.modifiedCount);

    res.json({ modifiedCount: updatedMessages.modifiedCount });
  } catch (err) {
    console.error("Error marking conversation as read:", err);
    res.status(500).json({ error: "Failed to mark conversation as read" });
  }
});
router.get('/map/:uid', async (req, res) => {
  try {
    const firebaseUid = req.params.uid;
    console.log('Backend - Mapping firebaseUid to userId:', firebaseUid);
    const user = await User.findOne({ firebaseUid: firebaseUid }).select('_id');
    if (!user) {
      console.error('Backend - User not found for firebaseUid:', firebaseUid);
      console.log('Backend - Available users:', await User.find().select('firebaseUid username _id'));
      return res.status(404).json({ error: 'Not Found' });
    }
    console.log('Backend - Mapped userId:', { userId: user._id });
    res.json({ userId: user._id });
  } catch (err) {
    console.error('Backend - Error mapping user:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to map user' });
  }
});

// Fetch user by _id
router.get('/by-id/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Backend - Invalid userId:', userId);
      return res.status(400).json({ error: 'Invalid userId' });
    }
    console.log('Backend - Fetching user by _id:', userId);
    const user = await User.findById(userId).select('username phoneNumber profilePictureUrl');
    if (!user) {
      console.error('Backend - User not found for _id:', userId);
      return res.status(404).json({ error: 'Not Found' });
    }
    console.log('Backend - User found:', {
      _id: user._id,
      username: user.username,
      profilePictureUrl: user.profilePictureUrl,
    });
    res.json({
      _id: user._id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      profilePictureUrl: user.profilePictureUrl,
    });
  } catch (err) {
    console.error('Backend - Error fetching user by _id:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Optional: Keep /users/:uid for compatibility
router.get('/:uid', async (req, res) => {
  try {
    const firebaseUid = req.params.uid;
    console.log('Backend - Fetching user for firebaseUid:', firebaseUid);
    const user = await User.findOne({ firebaseUid: firebaseUid }).select('username phoneNumber profilePictureUrl');
    if (!user) {
      console.error('Backend - User not found for firebaseUid:', firebaseUid);
      console.log('Backend - Available users:', await User.find().select('firebaseUid username _id'));
      return res.status(404).json({ error: 'Not Found' });
    }
    console.log('Backend - User found:', {
      _id: user._id,
      username: user.username,
      profilePictureUrl: user.profilePictureUrl,
    });
    res.json({
      _id: user._id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      profilePictureUrl: user.profilePictureUrl,
    });
  } catch (err) {
    console.error('Backend - Error fetching user:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
export const initMessageSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined their room`);
    });

    socket.on("sendMessage", (msg) => {
      console.log("📩 New message:", msg);
      io.to(msg.receiverId).emit("receiveMessage", msg);
    });

    socket.on("typing", ({ senderId, receiverId }) => {
      console.log("Typing event:", { senderId, receiverId });
      io.to(receiverId).emit("typing", { senderId });
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
      console.log("Stop Typing event:", { senderId, receiverId });
      io.to(receiverId).emit("stopTyping", { senderId });
    });

    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });
};

export default router;