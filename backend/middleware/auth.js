import admin from "../config/firebase.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ error: "Missing token" });

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // First check in User model
    let userDoc = await User.findOne({ firebaseUid: decodedToken.uid });

    // If not a user, check in Admin model
    if (!userDoc) {
      userDoc = await Admin.findOne({ firebaseUid: decodedToken.uid });
      if (!userDoc) {
        return res.status(401).json({ error: "User not found" });
      }
      req.isAdmin = true;   // ✅ mark as admin
    } else {
      req.isAdmin = false;  // ✅ mark as user
    }

    req.userId = userDoc._id;
    req.userEmail = userDoc.email;

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}
