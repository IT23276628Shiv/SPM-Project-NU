// routes/products.js
import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Get all products (with optional category filter)
router.get("/", async (req, res) => {
  try {
    const { categoryId } = req.query;

    // Build filter object
    let filter = { status: "available" };
    if (categoryId) filter.categoryId = categoryId;

    const products = await Product.find(filter)
      .sort({ listedDate: -1 })
      .populate("ownerId", "username phoneNumber")   // populate owner name
      .populate("categoryId", "name"); 

    const result = products.map((p) => ({
      ...p.toObject(),
      ownerName: p.ownerId?.username || "Unknown",
      ownerContact: p.ownerId?.phoneNumber || "Unknown",
      categoryName: p.categoryId?.name || "Unknown",

    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Create product
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      categoryId,
      title,
      description,
      condition,
      price,
      isForSwap,
      address,
      imagesUrls,
    } = req.body;

    // Validate required fields
    if (!categoryId || !title || !condition || !address || !imagesUrls?.length) {
      return res.status(400).json({ error: "Please fill all required fields" });
    }

    // Create product using firebaseUid as ownerId
    const product = await Product.create({
      ownerId: req.userId,
      categoryId,
      title,
      description,
      condition,
      price,
      isForSwap,
      address,
      imagesUrls,
    });

    res.status(201).json({ message: "Product added successfully", product });
  } catch (err) {
    console.error("Failed to add product:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

export default router;
