const express = require("express");
const mongoose = require("mongoose");

const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require login
router.use(authMiddleware);

// GET ALL TRANSACTIONS
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("Get Transactions Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not fetch transactions",
    });
  }
});

// ADD TRANSACTION
router.post("/", async (req, res) => {
  try {
    const {
      title,
      amount,
      type,
      category,
      date,
      walletId,
    } = req.body;

    if (
      !title ||
      amount === undefined ||
      !type ||
      !category ||
      !date
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid amount",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (isNaN(new Date(date).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date",
      });
    }

    // Verify wallet belongs to logged-in user
    if (walletId) {
      if (!mongoose.Types.ObjectId.isValid(walletId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid wallet",
        });
      }

      const wallet = await Wallet.findOne({
        _id: walletId,
        userId: req.userId,
      });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }
    }

    const transaction = await Transaction.create({
      userId: req.userId,
      title: title.trim(),
      amount: Number(amount),
      type,
      category,
      date: new Date(date),
      walletId: walletId || null,
    });

    res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      transaction,
    });
  } catch (error) {
    console.error("Add Transaction Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not add transaction",
    });
  }
});

// UPDATE TRANSACTION
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const transaction = await Transaction.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const { title, amount, type, category, date, walletId } =
      req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }

      transaction.title = title.trim();
    }

    if (amount !== undefined) {
      if (
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid amount",
        });
      }

      transaction.amount = Number(amount);
    }

    if (type !== undefined) {
      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction type",
        });
      }

      transaction.type = type;
    }

    if (category !== undefined) {
      transaction.category = category;
    }

    if (date !== undefined) {
      if (isNaN(new Date(date).getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction date",
        });
      }

      transaction.date = new Date(date);
    }

    if (walletId !== undefined) {
      if (walletId) {
        if (!mongoose.Types.ObjectId.isValid(walletId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid wallet",
          });
        }

        const wallet = await Wallet.findOne({
          _id: walletId,
          userId: req.userId,
        });

        if (!wallet) {
          return res.status(404).json({
            success: false,
            message: "Wallet not found",
          });
        }
      }

      transaction.walletId = walletId || null;
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    console.error("Update Transaction Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not update transaction",
    });
  }
});

// DELETE TRANSACTION
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete Transaction Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not delete transaction",
    });
  }
});

module.exports = router;