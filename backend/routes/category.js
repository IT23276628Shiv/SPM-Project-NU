import { Router } from "express";
import Category from "../models/category.js";
import admin from "../config/firebase.js"; // <-- use Firebase Admin like in products

const router = Router();

// Middleware to verify Firebase token (admin-only routes if needed)
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;

    // If you want admin-only access, check custom claims:
    // if (!decoded.admin) return res.status(403).json({ error: "Admin only" });

    next();
  } catch (e) {
    console.error("Auth error:", e.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Create a category (protected, admin only)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, parentCategoryId, description, iconUrl } = req.body;
    if (!name) return res.status(400).json({ error: "Missing required fields" });

    const category = await Category.create({ name, parentCategoryId, description, iconUrl });
    res.status(201).json({ category });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all categories (public)
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().populate("parentCategoryId", "name");
    res.json({ categories });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a single category
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate("parentCategoryId", "name");
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ category });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a category (protected, admin only)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, parentCategoryId, description, iconUrl } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, parentCategoryId, description, iconUrl },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ category });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a category (protected, admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
