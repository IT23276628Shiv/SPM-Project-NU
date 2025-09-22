// routes/products.js
import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// // Get all products (with optional category filter)
// router.get("/", async (req, res) => {
//   try {
//     const { categoryId } = req.query;

//     // Build filter object
//     let filter = { status: "available" };
//     if (categoryId) filter.categoryId = categoryId;

//     const products = await Product.find(filter)
//       .sort({ listedDate: -1 })
//       .populate("ownerId", "username phoneNumber firebaseUid")   // populate owner name
//       .populate("categoryId", "name"); 

//     const result = products.map((p) => ({
//       ...p.toObject(),
//       ownerName: p.ownerId?.username || "Unknown",
//       ownerContact: p.ownerId?.phoneNumber || "Unknown",
//       categoryName: p.categoryId?.name || "Unknown",

//     }));

//     res.json(result);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// });


// Get all products (with optional category filter, or all statuses for activity page)
router.get("/", async (req, res) => {
  try {
    const { categoryId, all } = req.query;

    let filter = {};
    if (!all) {
      // default: only available products
      filter.status = "available";
    }

    if (categoryId) filter.categoryId = categoryId;

    const products = await Product.find(filter)
      .sort({ listedDate: -1 })
      .populate("ownerId", "username phoneNumber firebaseUid")
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

// 🔹 Create swap request
router.post("/:id/swap", async (req, res) => {
  try {
    const { buyerId, buyerProductId } = req.body;
    const sellerProductId = req.params.id;

    const product = await Product.findById(sellerProductId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Push swap request
    product.swapRequests.push({
      buyerId,
      buyerProductId,
      status: "pending",
    });

    await product.save();

    res.json({ message: "Swap request created", product });
  } catch (err) {
    console.error("Swap request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Cancel a swap request (buyer only)
router.patch("/:id/swap/:requestId/cancel", async (req, res) => {
  try {
    const { id: productId, requestId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const request = product.swapRequests.id(requestId);
    if (!request) return res.status(404).json({ error: "Swap request not found" });

    // Only buyer can cancel
    if (request.buyerId !== req.body.userId) {
      return res.status(403).json({ error: "You are not authorized to cancel this request" });
    }

    request.status = "cancelled";
    await product.save();

    res.json({ message: "Swap request cancelled", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



// Respond to a swap request (seller only)
router.patch("/:productId/swap/:swapId/respond", async (req, res) => {
  try {
    const { productId, swapId } = req.params;
    const { status, userId } = req.body; // userId = seller's Firebase UID

    // Populate ownerId to get firebaseUid
    const product = await Product.findById(productId)
      .populate("ownerId", "firebaseUid");
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Find swap request
    const swapReq = product.swapRequests.id(swapId);
    if (!swapReq) return res.status(404).json({ message: "Swap request not found" });

    // Only seller can respond
    if (product.ownerId.firebaseUid !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update status
    swapReq.status = status;

    if (status === "accepted") {
      // Mark seller’s product as swapped
      product.status = "swapped";

      // Also mark buyer’s offered product as swapped
      await Product.findByIdAndUpdate(
        swapReq.buyerProductId,
        { status: "swapped" }
      );
    }

    await product.save();

    res.json({ message: "Swap request updated", product, swapReq });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Delete product (only owner can delete, cancels swaps too)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // ✅ Authorization check
    if (product.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this product" });
    }

    // Cancel pending swaps if this is seller
    if (product.swapRequests?.length) {
      product.swapRequests.forEach((swap) => {
        if (swap.status === "pending") swap.status = "cancelled";
      });
      await product.save();
    }

    // Cancel pending swaps where this product is used as buyer
    const otherProducts = await Product.find({ "swapRequests.buyerProductId": id });
    for (const p of otherProducts) {
      let updated = false;
      p.swapRequests.forEach((swap) => {
        if (swap.buyerProductId === id && swap.status === "pending") {
          swap.status = "cancelled";
          updated = true;
        }
      });
      if (updated) await p.save();
    }

    await product.deleteOne();

    res.json({ message: "Product deleted successfully, related pending swaps cancelled" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});





export default router;
