
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const walletRoutes = require("./routes/walletRoutes");
const budgetRoutes = require("./routes/budgetRoutes");

const app = express();

// CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5174",
  "http://localhost:5173",
  "https://client-tawny-six-73.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `SmartKharcha Backend running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
