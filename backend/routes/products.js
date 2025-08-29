// routes/products.js
import express from "express";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ status: "available" }).sort({ listedDate: -1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});
// Create product (receive JSON with imagesUrls)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      categoryId,
      title,
      description,
      condition,
      price,
      isForSwap,
      swapPreferences,
      address,
      imagesUrls,
    } = req.body;

    if (!categoryId || !title || !condition) {
      return res.status(400).json({ error: "Please fill all required fields" });
    }

    if (!imagesUrls || imagesUrls.length === 0) {
      return res.status(400).json({ error: "Please add at least 1 image" });
    }

    const product = await Product.create({
      ownerId: req.userId,
      categoryId,
      title,
      description,
      condition,
      price,
      isForSwap,
      swapPreferences,
      address,
      imagesUrls,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Product creation failed" });
  }
});

export default router;
