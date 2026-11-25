
const express = require("express");
const mongoose = require("mongoose");

const Budget = require("../models/Budget");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// GET ALL BUDGETS
router.get("/", async (req, res) => {
  try {
    const budgets = await Budget.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      budgets,
    });
  } catch (error) {
    console.error("Get Budgets Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not fetch budgets",
    });
  }
});

// ADD BUDGET
router.post("/", async (req, res) => {
  try {
    const { category, limit } = req.body;

    if (!category || limit === undefined) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (
      !Number.isFinite(Number(limit)) ||
      Number(limit) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid budget limit",
      });
    }

    const existingBudget = await Budget.findOne({
      userId: req.userId,
      category: category.trim(),
    });

    if (existingBudget) {
      return res.status(409).json({
        success: false,
        message: "Budget for this category already exists",
      });
    }

    const budget = await Budget.create({
      userId: req.userId,
      category: category.trim(),
      limit: Number(limit),
    });

    res.status(201).json({
      success: true,
      message: "Budget added successfully",
      budget,
    });
  } catch (error) {
    console.error("Add Budget Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not add budget",
    });
  }
});

// UPDATE BUDGET
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { category, limit } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID",
      });
    }

    const budget = await Budget.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    if (category !== undefined) {
      if (!category.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be empty",
        });
      }

      const existingBudget = await Budget.findOne({
        userId: req.userId,
        category: category.trim(),
        _id: { $ne: id },
      });

      if (existingBudget) {
        return res.status(409).json({
          success: false,
          message: "Budget for this category already exists",
        });
      }

      budget.category = category.trim();
    }

    if (limit !== undefined) {
      if (
        !Number.isFinite(Number(limit)) ||
        Number(limit) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid budget limit",
        });
      }

      budget.limit = Number(limit);
    }

    await budget.save();

    res.status(200).json({
      success: true,
      message: "Budget updated successfully",
      budget,
    });
  } catch (error) {
    console.error("Update Budget Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not update budget",
    });
  }
});

// DELETE BUDGET
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID",
      });
    }

    const budget = await Budget.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Delete Budget Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not delete budget",
    });
  }
});

module.exports = router;
