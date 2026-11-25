
const express = require("express");
const mongoose = require("mongoose");

const Wallet = require("../models/Wallet");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// GET ALL WALLETS
router.get("/", async (req, res) => {
  try {
    const wallets = await Wallet.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      wallets,
    });
  } catch (error) {
    console.error("Get Wallets Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not fetch wallets",
    });
  }
});

// ADD WALLET
router.post("/", async (req, res) => {
  try {
    const { name, balance, type } = req.body;

    if (!name || balance === undefined || !type) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (
      !Number.isFinite(Number(balance)) ||
      Number(balance) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid balance",
      });
    }

    const wallet = await Wallet.create({
      userId: req.userId,
      name: name.trim(),
      balance: Number(balance),
      type,
    });

    res.status(201).json({
      success: true,
      message: "Wallet added successfully",
      wallet,
    });
  } catch (error) {
    console.error("Add Wallet Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not add wallet",
    });
  }
});

// UPDATE WALLET
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, balance, type } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet ID",
      });
    }

    const wallet = await Wallet.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Wallet name cannot be empty",
        });
      }

      wallet.name = name.trim();
    }

    if (balance !== undefined) {
      if (
        !Number.isFinite(Number(balance)) ||
        Number(balance) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid balance",
        });
      }

      wallet.balance = Number(balance);
    }

    if (type !== undefined) {
      wallet.type = type;
    }

    await wallet.save();

    res.status(200).json({
      success: true,
      message: "Wallet updated successfully",
      wallet,
    });
  } catch (error) {
    console.error("Update Wallet Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not update wallet",
    });
  }
});

// DELETE WALLET
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet ID",
      });
    }

    const wallet = await Wallet.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Wallet deleted successfully",
    });
  } catch (error) {
    console.error("Delete Wallet Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not delete wallet",
    });
  }
});

module.exports = router;
