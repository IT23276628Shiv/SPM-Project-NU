import admin from "../config/firebase.js";
import User from "../models/User.js";

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ error: "Missing token" });

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find user in MongoDB by firebaseUid
    const userDoc = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!userDoc) return res.status(401).json({ error: "User not found" });

    req.userId = userDoc._id; // MongoDB ObjectId
    req.userEmail = userDoc.email; // optional
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}
