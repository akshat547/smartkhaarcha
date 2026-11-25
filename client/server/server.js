
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const walletRoutes = require("./routes/walletRoutes");
const budgetRoutes = require("./routes/budgetRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5174",
  })
);

app.use(express.json());

// HOME ROUTE
app.get("/", (req, res) => {
  res.send("SmartKharcha API is running!");
});

// AUTH ROUTES
app.use("/api/auth", authRoutes);

// TRANSACTION ROUTES
app.use("/api/transactions", transactionRoutes);

// WALLET ROUTES
app.use("/api/wallets", walletRoutes);

// BUDGET ROUTES
app.use("/api/budgets", budgetRoutes);

// SERVER
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(
      `SmartKharcha Backend running on http://localhost:${PORT}`
    );
  });
};

startServer();
