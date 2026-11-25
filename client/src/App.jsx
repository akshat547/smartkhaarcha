
import { useState, useEffect, useCallback } from "react";

import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  Target,
  BrainCircuit,
  Settings,
  Bell,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  MoreHorizontal,
  Sparkles,
  CalendarDays,
  ChevronDown,
  Menu,
  X,
  Trash2,
  LogOut,
} from "lucide-react";

import {
  signupUser,
  loginUser,
  getCurrentUser,
  getTransactions,
  addTransactionAPI,
  deleteTransactionAPI,
  getWallets,
  addWalletAPI,
  deleteWalletAPI,
  getBudgets,
  addBudgetAPI,
  updateBudgetAPI,
  deleteBudgetAPI,
} from "./api";

import "./App.css";

// CATEGORY DETAILS
const getCategoryDetails = (category) => {
  const categories = {
    Shopping: { icon: ShoppingBag, color: "purple" },
    Food: { icon: Utensils, color: "orange" },
    Travel: { icon: Car, color: "blue" },
    Utilities: { icon: Zap, color: "yellow" },
    Income: { icon: Wallet, color: "green" },
    Other: { icon: CreditCard, color: "purple" },
  };

  return categories[category] || categories.Other;
};

// NAVIGATION
const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Transactions", icon: ArrowLeftRight },
  { name: "My Wallet", icon: Wallet },
  { name: "Analytics", icon: ChartNoAxesCombined },
  { name: "Budgets", icon: Target },
  { name: "AI Assistant", icon: BrainCircuit },
];

const formatMoney = (amount) =>
  "₹" + Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTransactionDate = (dateValue) => {
  if (!dateValue) return null;

  const value = String(dateValue);

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (dateValue) => {
  const date = getTransactionDate(dateValue);

  if (!date) return String(dateValue || "");

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// MAP BACKEND TRANSACTIONS TO UI DATA
const mapTransaction = (item) => {
  const details = getCategoryDetails(item.category);

  return {
    id: String(item._id),
    name: item.title,
    amount: Number(item.amount || 0),
    type: item.type,
    category: item.category,
    date: item.date,
    walletId: item.walletId ? String(item.walletId) : "",
    icon: details.icon,
    color: details.color,
  };
};

const mapWallet = (item) => ({
  id: String(item._id),
  name: item.name,
  balance: Number(item.balance || 0),
  type: item.type,
});

const mapBudget = (item) => ({
  id: String(item._id),
  category: item.category,
  limit: Number(item.limit || 0),
});

function App() {
  // AUTH STATES
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // APP STATES
  const [activePage, setActivePage] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  // DATA STATES
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);

  // WALLET FORM
  const [walletForm, setWalletForm] = useState({
    name: "",
    type: "bank",
    balance: "",
  });

  const [selectedWallet, setSelectedWallet] = useState("all");

  // BUDGET FORM
  const [budgetForm, setBudgetForm] = useState({
    category: "Shopping",
    limit: "",
  });

  const [editingBudgetId, setEditingBudgetId] = useState(null);

  // TRANSACTION FORM
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    type: "expense",
    category: "Shopping",
    date: getToday(),
    walletId: "",
  });

  // FILTERS
  const [transactionSearch, setTransactionSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("all");

  // LOAD ACCOUNT DATA
  const loadAccountData = useCallback(async () => {
    setDataLoading(true);
    setPageError("");

    try {
      const [transactionResponse, walletResponse, budgetResponse] =
        await Promise.all([
          getTransactions(),
          getWallets(),
          getBudgets(),
        ]);

      setTransactions(
        (transactionResponse.transactions || []).map(mapTransaction)
      );

      setWallets(
        (walletResponse.wallets || []).map(mapWallet)
      );

      setBudgets(
        (budgetResponse.budgets || []).map(mapBudget)
      );
    } catch (error) {
      setPageError(error.message || "Could not load your account data.");

      if (
        error.message?.toLowerCase().includes("token") ||
        error.message?.toLowerCase().includes("login") ||
        error.message?.toLowerCase().includes("unauthorized")
      ) {
        handleLogout();
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  // CHECK LOGIN WHEN APP STARTS
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const token = localStorage.getItem("finora_token");

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();

        if (cancelled) return;

        setUser(response.user);
        await loadAccountData();
      } catch (error) {
        localStorage.removeItem("finora_token");
        localStorage.removeItem("finora_user");

        if (!cancelled) {
          setUser(null);
          setTransactions([]);
          setWallets([]);
          setBudgets([]);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [loadAccountData]);

  // LOGIN / SIGNUP
  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");

    const email = authForm.email.trim().toLowerCase();
    const password = authForm.password;

    if (!email || !password) {
      setAuthError("Please enter your email and password.");
      return;
    }

    if (authMode === "signup") {
      if (!authForm.name.trim()) {
        setAuthError("Please enter your name.");
        return;
      }

      if (password.length < 8) {
        setAuthError("Password must contain at least 8 characters.");
        return;
      }
    }

    setAuthSubmitting(true);

    try {
      const response =
        authMode === "signup"
          ? await signupUser({
              name: authForm.name.trim(),
              email,
              password,
            })
          : await loginUser({
              email,
              password,
            });

      if (!response.token || !response.user) {
        throw new Error("Invalid server response. Please try again.");
      }

      localStorage.setItem("SmartKharcha_token", response.token);
      localStorage.setItem(
        "SmartKharcha_user",
        JSON.stringify(response.user)
      );

      setUser(response.user);
      setActivePage("Overview");
      setAuthForm({
        name: "",
        email: "",
        password: "",
      });

      await loadAccountData();
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("finora_token");
    localStorage.removeItem("finora_user");

    setUser(null);
    setTransactions([]);
    setWallets([]);
    setBudgets([]);

    setActivePage("Overview");
    setSidebarOpen(false);
    setShowModal(false);
    setShowWalletModal(false);
    setShowBudgetModal(false);

    setPageError("");
    setAuthError("");
  };

  // FILTERED TRANSACTIONS
  const filteredTransactions = [...transactions]
    .filter((transaction) => {
      const name = String(transaction.name || "").toLowerCase();
      const category = String(transaction.category || "").toLowerCase();
      const query = transactionSearch.trim().toLowerCase();

      return (
        !query ||
        name.includes(query) ||
        category.includes(query)
      );
    })
    .filter((transaction) =>
      typeFilter === "all" || transaction.type === typeFilter
    )
    .filter((transaction) =>
      categoryFilter === "all" ||
      transaction.category === categoryFilter
    )
    .sort((a, b) => {
      const dateA = getTransactionDate(a.date)?.getTime() || 0;
      const dateB = getTransactionDate(b.date)?.getTime() || 0;

      return sortOrder === "newest"
        ? dateB - dateA
        : dateA - dateB;
    });

  // TRANSACTION TOTALS
  const pageIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const pageExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const pageNet = pageIncome - pageExpenses;

  // WALLET BALANCES
  const walletBalances = wallets.map((wallet) => {
    const linkedTransactions = transactions.filter(
      (transaction) =>
        String(transaction.walletId) === String(wallet.id)
    );

    const income = linkedTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const expenses = linkedTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      ...wallet,
      currentBalance: Number(wallet.balance || 0) + income - expenses,
      income,
      expenses,
      transactionCount: linkedTransactions.length,
    };
  });

  const totalWalletBalance = walletBalances.reduce(
    (sum, wallet) => sum + wallet.currentBalance,
    0
  );

  // ACCOUNT STATS
  const totalIncome = pageIncome;
  const totalExpenses = pageExpenses;
  const totalBalance = totalWalletBalance;
  const totalSavings = totalIncome - totalExpenses;

  // WALLET FILTER
  const walletTransactions = transactions.filter(
    (transaction) =>
      selectedWallet === "all" ||
      String(transaction.walletId) === String(selectedWallet)
  );

  // CURRENT MONTH EXPENSES
  const currentMonthExpenses = transactions.filter((transaction) => {
    if (transaction.type !== "expense") return false;

    const date = getTransactionDate(transaction.date);
    if (!date) return false;

    const today = new Date();

    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  });

  // BUDGET DETAILS
  const budgetDetails = budgets.map((budget) => {
    const spent = currentMonthExpenses
      .filter((transaction) => transaction.category === budget.category)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const limit = Number(budget.limit || 0);
    const remaining = limit - spent;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      ...budget,
      spent,
      remaining,
      percentage,
      exceeded: spent > limit,
      nearLimit: percentage >= 80 && percentage <= 100,
    };
  });

  const totalBudgetLimit = budgetDetails.reduce(
    (sum, budget) => sum + Number(budget.limit || 0),
    0
  );

  const totalBudgetSpent = budgetDetails.reduce(
    (sum, budget) => sum + budget.spent,
    0
  );

  const totalBudgetRemaining = totalBudgetLimit - totalBudgetSpent;

  const overallBudgetPercentage =
    totalBudgetLimit > 0
      ? (totalBudgetSpent / totalBudgetLimit) * 100
      : 0;

  // ADD TRANSACTION
  const openModal = () => {
    if (wallets.length === 0) {
      alert("Please create a wallet before adding a transaction.");
      setActivePage("My Wallet");
      setShowWalletModal(true);
      return;
    }

    setFormData({
      name: "",
      amount: "",
      type: "expense",
      category: "Shopping",
      date: getToday(),
      walletId: String(wallets[0].id),
    });

    setShowModal(true);
  };

  const handleAddTransaction = async (event) => {
    event.preventDefault();

    const amount = Number(formData.amount);

    if (
      !formData.name.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert("Please enter a valid description and amount.");
      return;
    }

    if (!wallets.some((wallet) => wallet.id === String(formData.walletId))) {
      alert("Please select a valid wallet.");
      return;
    }

    setSaving(true);

    try {
      const response = await addTransactionAPI({
        title: formData.name.trim(),
        amount,
        type: formData.type,
        category: formData.category,
        date: formData.date,
        walletId: formData.walletId,
      });

      if (!response.transaction) {
        throw new Error("Transaction was not returned by the server.");
      }

      setTransactions((previous) => [
        mapTransaction(response.transaction),
        ...previous,
      ]);

      setShowModal(false);
      setActivePage("Overview");
    } catch (error) {
      alert(error.message || "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  };

  // DELETE TRANSACTION
  const deleteTransaction = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      await deleteTransactionAPI(id);

      setTransactions((previous) =>
        previous.filter((transaction) => transaction.id !== String(id))
      );
    } catch (error) {
      alert(error.message || "Could not delete transaction.");
    }
  };

  // ADD WALLET
  const handleAddWallet = async (event) => {
    event.preventDefault();

    const name = walletForm.name.trim();
    const balance = Number(walletForm.balance);

    if (
      !name ||
      walletForm.balance === "" ||
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      alert("Please enter a wallet name and a valid starting balance.");
      return;
    }

    setSaving(true);

    try {
      const response = await addWalletAPI({
        name,
        type: walletForm.type,
        balance,
      });

      if (!response.wallet) {
        throw new Error("Wallet was not returned by the server.");
      }

      const newWallet = mapWallet(response.wallet);

      setWallets((previous) => [...previous, newWallet]);
      setSelectedWallet(newWallet.id);

      setWalletForm({
        name: "",
        type: "bank",
        balance: "",
      });

      setShowWalletModal(false);
    } catch (error) {
      alert(error.message || "Could not create wallet.");
    } finally {
      setSaving(false);
    }
  };

  // DELETE WALLET
  const deleteWallet = async (walletId) => {
    const hasTransactions = transactions.some(
      (transaction) => String(transaction.walletId) === String(walletId)
    );

    if (hasTransactions) {
      alert(
        "This wallet has transactions linked to it. Delete or move those transactions first."
      );
      return;
    }

    if (!window.confirm("Delete this wallet?")) return;

    try {
      await deleteWalletAPI(walletId);

      setWallets((previous) =>
        previous.filter((wallet) => wallet.id !== String(walletId))
      );

      if (selectedWallet === String(walletId)) {
        setSelectedWallet("all");
      }
    } catch (error) {
      alert(error.message || "Could not delete wallet.");
    }
  };

  // SAVE BUDGET
  const handleSaveBudget = async (event) => {
    event.preventDefault();

    const limit = Number(budgetForm.limit);

    if (
      !budgetForm.category ||
      budgetForm.limit === "" ||
      !Number.isFinite(limit) ||
      limit <= 0
    ) {
      alert("Please enter a valid budget amount.");
      return;
    }

    const existingBudget = budgets.find(
      (budget) =>
        budget.category === budgetForm.category &&
        budget.id !== editingBudgetId
    );

    if (existingBudget) {
      alert("A budget for this category already exists.");
      return;
    }

    setSaving(true);

    try {
      let response;

      if (editingBudgetId) {
        response = await updateBudgetAPI(editingBudgetId, {
          category: budgetForm.category,
          limit,
        });
      } else {
        response = await addBudgetAPI({
          category: budgetForm.category,
          limit,
        });
      }

      const savedBudget = mapBudget(response.budget);

      setBudgets((previous) => {
        if (editingBudgetId) {
          return previous.map((budget) =>
            budget.id === editingBudgetId ? savedBudget : budget
          );
        }

        return [...previous, savedBudget];
      });

      setBudgetForm({
        category: "Shopping",
        limit: "",
      });

      setEditingBudgetId(null);
      setShowBudgetModal(false);
    } catch (error) {
      alert(error.message || "Could not save budget.");
    } finally {
      setSaving(false);
    }
  };

  // EDIT BUDGET
  const editBudget = (budget) => {
    setEditingBudgetId(budget.id);

    setBudgetForm({
      category: budget.category,
      limit: String(budget.limit),
    });

    setShowBudgetModal(true);
  };

  // DELETE BUDGET
  const deleteBudget = async (budgetId) => {
    if (!window.confirm("Are you sure you want to delete this budget?")) {
      return;
    }

    try {
      await deleteBudgetAPI(budgetId);

      setBudgets((previous) =>
        previous.filter((budget) => budget.id !== String(budgetId))
      );
    } catch (error) {
      alert(error.message || "Could not delete budget.");
    }
  };

  // ANALYTICS
  const analyticsTransactions = transactions.filter((transaction) => {
    if (analyticsPeriod === "all") return true;

    const date = getTransactionDate(transaction.date);
    if (!date) return false;

    const today = new Date();

    if (analyticsPeriod === "month") {
      return (
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }

    if (analyticsPeriod === "week") {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - 6);

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      return date >= startDate && date <= endDate;
    }

    return true;
  });

  const analyticsIncome = analyticsTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const analyticsExpenses = analyticsTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const analyticsSavings = analyticsIncome - analyticsExpenses;

  const expenseCategories = Object.entries(
    analyticsTransactions
      .filter((t) => t.type === "expense")
      .reduce((result, transaction) => {
        const category = transaction.category || "Other";
        result[category] =
          (result[category] || 0) + Number(transaction.amount || 0);
        return result;
      }, {})
  )
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalCategoryExpenses = expenseCategories.reduce(
    (sum, category) => sum + category.amount,
    0
  );

  const totalActivity = analyticsIncome + analyticsExpenses;

  const incomePercentage =
    totalActivity > 0 ? (analyticsIncome / totalActivity) * 100 : 0;

  const expensePercentage =
    totalActivity > 0 ? (analyticsExpenses / totalActivity) * 100 : 0;

  // OVERVIEW STATS
  const stats = [
    {
      title: "Total Balance",
      amount: totalBalance,
      icon: Wallet,
      color: "purple-icon",
    },
    {
      title: "Total Income",
      amount: totalIncome,
      icon: ArrowDownRight,
      color: "green-icon",
    },
    {
      title: "Total Expenses",
      amount: totalExpenses,
      icon: ArrowUpRight,
      color: "orange-icon",
    },
    {
      title: "Total Savings",
      amount: totalSavings,
      icon: CreditCard,
      color: "blue-icon",
    },
  ];

  const recentTransactions = [...transactions]
    .sort((a, b) => {
      const dateA = getTransactionDate(a.date)?.getTime() || 0;
      const dateB = getTransactionDate(b.date)?.getTime() || 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  // AUTH LOADING SCREEN
  if (authLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-icon">
            <Wallet size={25} />
          </div>
          <h2>SmartKharcha.</h2>
          <p>Loading your account...</p>
        </div>
      </div>
    );
  }

  // LOGIN / SIGNUP SCREEN
  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="brand-icon">
              <Wallet size={25} />
            </div>
            <span>SmartKharcha<span className="brand-dot">.</span></span>
          </div>

          <p className="eyebrow">YOUR PERSONAL FINANCE SPACE</p>

          <h1>
            {authMode === "login" ? "Welcome back." : "Create account."}
          </h1>

          <p className="auth-description">
            {authMode === "login"
              ? "Login to manage your money and view your financial dashboard."
              : "Create your SmartKharcha account and start managing your finances."}
          </p>

          {authError && (
            <div className="auth-error">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit}>
            {authMode === "signup" && (
              <>
                <label>Full Name</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="Enter your name"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      name: event.target.value,
                    })
                  }
                  required
                />
              </>
            )}

            <label>Email Address</label>
            <input
              className="modal-input"
              type="email"
              placeholder="Enter your email"
              value={authForm.email}
              onChange={(event) =>
                setAuthForm({
                  ...authForm,
                  email: event.target.value,
                })
              }
              required
            />

            <label>Password</label>
            <input
              className="modal-input"
              type="password"
              placeholder="Enter your password"
              minLength={8}
              value={authForm.password}
              onChange={(event) =>
                setAuthForm({
                  ...authForm,
                  password: event.target.value,
                })
              }
              required
            />

            <button
              className="save-button auth-submit"
              type="submit"
              disabled={authSubmitting}
            >
              {authSubmitting
                ? "Please wait..."
                : authMode === "login"
                  ? "Login to SmartKharcha"
                  : "Create Account"}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setAuthError("");
              }}
            >
              {authMode === "login" ? "Sign up" : "Login"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={23} />
          </div>

          <span>
            SmartKharcha<span className="brand-dot">.</span>
          </span>

          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace">
          <div className="workspace-icon">F</div>
          <div>
            <h4>Personal Space</h4>
            <p>Free Plan</p>
          </div>
          <ChevronDown size={16} />
        </div>

        <p className="nav-label">MENU</p>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {item.name === "AI Assistant" && (
                  <span className="new-badge">AI</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Sparkles size={19} />
            </div>

            <h4>Unlock SmartKharcha Pro</h4>
            <p>Get smarter insights and unlimited financial analytics.</p>

            <button onClick={() => alert("Pro features coming soon!")}>
              Explore Pro <ArrowUpRight size={15} />
            </button>
          </div>

          <button
            className={`nav-item settings-item ${
              activePage === "Settings" ? "active" : ""
            }`}
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="profile">
            <div className="avatar">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>

            <div className="profile-info">
              <h4>{user.name}</h4>
              <p>Personal Account</p>
            </div>

            <button
              className="delete-transaction"
              title="Logout"
              onClick={handleLogout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="page-heading">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <h2>{activePage}</h2>
              <p>
                {activePage === "Transactions"
                  ? "Review and manage your financial activity."
                  : activePage === "My Wallet"
                    ? "View balances and manage your wallets."
                    : activePage === "Analytics"
                      ? "Understand your financial performance."
                      : activePage === "Budgets"
                        ? "Plan your spending and stay within your limits."
                        : activePage === "Overview"
                          ? `Welcome back, ${user.name}! Here's your financial overview.`
                          : `Manage your ${activePage.toLowerCase()} details.`}
              </p>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search anything..." />
              <span>⌘ K</span>
            </div>

            <button className="icon-button notification-button">
              <Bell size={19} />
              <span />
            </button>

            <div className="top-avatar">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="dashboard-content">

          {pageError && (
            <div className="auth-error" style={{ marginBottom: 18 }}>
              {pageError}
              <button
                className="view-all"
                onClick={loadAccountData}
                style={{ marginLeft: 12 }}
              >
                Retry
              </button>
            </div>
          )}

          {dataLoading ? (
            <div className="transaction-empty-state">
              <div><Wallet size={23} /></div>
              <h3>Loading your financial data...</h3>
              <p>Please wait while SmartKharcha loads your account.</p>
            </div>
          ) : (

            <>
              {/* TRANSACTIONS PAGE */}
              {activePage === "Transactions" && (
                <section className="transactions-page">
                  <div className="transactions-page-heading">
                    <div>
                      <p className="eyebrow">YOUR MONEY ACTIVITY</p>
                      <h1>All <span>Transactions.</span></h1>
                      <p className="welcome-description">
                        Search, review and manage every income and expense in one place.
                      </p>
                    </div>

                    <button className="add-transaction" onClick={openModal}>
                      <Plus size={19} />
                      Add Transaction
                    </button>
                  </div>

                  <div className="transaction-summary-grid">
                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Income</span>
                      <strong className="summary-income">
                        {formatMoney(pageIncome)}
                      </strong>
                      <span className="summary-note">All recorded income</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Expenses</span>
                      <strong className="summary-expense">
                        {formatMoney(pageExpenses)}
                      </strong>
                      <span className="summary-note">All recorded expenses</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Net Balance</span>
                      <strong className={pageNet >= 0 ? "summary-income" : "summary-expense"}>
                        {formatMoney(pageNet)}
                      </strong>
                      <span className="summary-note">Income minus expenses</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Records</span>
                      <strong>{transactions.length}</strong>
                      <span className="summary-note">Saved transactions</span>
                    </div>
                  </div>

                  <div className="panel transaction-manager">
                    <div className="panel-header transaction-manager-header">
                      <div>
                        <h3>Transaction History</h3>
                        <p>
                          {filteredTransactions.length} of {transactions.length} transactions shown
                        </p>
                      </div>

                      <button
                        className="view-all"
                        onClick={() => {
                          setTransactionSearch("");
                          setTypeFilter("all");
                          setCategoryFilter("all");
                          setSortOrder("newest");
                        }}
                      >
                        Reset filters
                      </button>
                    </div>

                    <div className="transaction-tools">
                      <div className="transaction-search-field">
                        <Search size={17} />
                        <input
                          placeholder="Search by name or category..."
                          value={transactionSearch}
                          onChange={(event) => setTransactionSearch(event.target.value)}
                        />
                      </div>

                      <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                      >
                        <option value="all">All types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>

                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                      >
                        <option value="all">All categories</option>
                        {[...new Set(transactions.map((t) => t.category))]
                          .sort()
                          .map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                      </select>

                      <select
                        value={sortOrder}
                        onChange={(event) => setSortOrder(event.target.value)}
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                      </select>
                    </div>

                    <div className="transaction-history-list">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => {
                          const Icon = getCategoryDetails(transaction.category).icon;
                          const color = getCategoryDetails(transaction.category).color;

                          return (
                            <div className="transaction-history-row" key={transaction.id}>
                              <div className={`transaction-icon ${color}`}>
                                <Icon size={19} />
                              </div>

                              <div className="transaction-details">
                                <h4>{transaction.name}</h4>
                                <p>{formatDate(transaction.date)}</p>
                              </div>

                              <span className="history-category">
                                {transaction.category}
                              </span>

                              <strong className={`transaction-amount ${
                                transaction.type === "income" ? "income-amount" : ""
                              }`}>
                                {transaction.type === "income" ? "+" : "−"}
                                {formatMoney(transaction.amount)}
                              </strong>

                              <button
                                className="delete-transaction"
                                title="Delete transaction"
                                onClick={() => deleteTransaction(transaction.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="transaction-empty-state">
                          <div><Search size={23} /></div>
                          <h3>No transactions found</h3>
                          <p>Try changing your search or filters.</p>
                          <button
                            className="view-all"
                            onClick={() => {
                              setTransactionSearch("");
                              setTypeFilter("all");
                              setCategoryFilter("all");
                            }}
                          >
                            Clear search and filters
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* MY WALLET PAGE */}
              {activePage === "My Wallet" && (
                <section className="transactions-page wallet-page">
                  <div className="transactions-page-heading">
                    <div>
                      <p className="eyebrow">MANAGE YOUR MONEY</p>
                      <h1>My <span>Wallets.</span></h1>
                      <p className="welcome-description">
                        Keep track of your cash, bank accounts and digital wallets.
                      </p>
                    </div>

                    <button
                      className="add-transaction"
                      onClick={() => setShowWalletModal(true)}
                    >
                      <Plus size={19} />
                      Add Wallet
                    </button>
                  </div>

                  <div className="transaction-summary-grid">
                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Wallet Balance</span>
                      <strong className="summary-income">
                        {formatMoney(totalWalletBalance)}
                      </strong>
                      <span className="summary-note">Across all your wallets</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Wallets</span>
                      <strong>{walletBalances.length}</strong>
                      <span className="summary-note">Active accounts</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Money In</span>
                      <strong className="summary-income">
                        {formatMoney(walletBalances.reduce((sum, wallet) => sum + wallet.income, 0))}
                      </strong>
                      <span className="summary-note">Linked income transactions</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Money Out</span>
                      <strong className="summary-expense">
                        {formatMoney(walletBalances.reduce((sum, wallet) => sum + wallet.expenses, 0))}
                      </strong>
                      <span className="summary-note">Linked expense transactions</span>
                    </div>
                  </div>

                  <div
                    className="wallet-card-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 18,
                      marginBottom: 24,
                    }}
                  >
                    {walletBalances.map((wallet) => {
                      const WalletIcon =
                        wallet.type === "cash"
                          ? Wallet
                          : wallet.type === "upi"
                            ? Sparkles
                            : CreditCard;

                      return (
                        <div className="panel wallet-card" key={wallet.id}>
                          <div className="wallet-card-top">
                            <div className="stat-icon purple-icon">
                              <WalletIcon size={21} />
                            </div>

                            <button
                              className="delete-transaction"
                              title="Delete wallet"
                              onClick={() => deleteWallet(wallet.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <p className="summary-label">
                            {wallet.type.toUpperCase()} WALLET
                          </p>

                          <h3>{wallet.name}</h3>

                          <strong className="wallet-balance">
                            {formatMoney(wallet.currentBalance)}
                          </strong>

                          <div className="wallet-card-meta">
                            <span>{wallet.transactionCount} transactions</span>
                            <button
                              className="view-all"
                              onClick={() => setSelectedWallet(wallet.id)}
                            >
                              View activity <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {wallets.length === 0 && (
                    <div className="panel transaction-empty-state">
                      <div><Wallet size={23} /></div>
                      <h3>No wallets created yet</h3>
                      <p>Create a wallet before adding transactions.</p>
                      <button
                        className="add-transaction"
                        onClick={() => setShowWalletModal(true)}
                      >
                        <Plus size={17} />
                        Create Wallet
                      </button>
                    </div>
                  )}

                  <div className="panel transaction-manager">
                    <div className="panel-header transaction-manager-header">
                      <div>
                        <h3>Wallet Activity</h3>
                        <p>Transactions recorded in your wallets</p>
                      </div>

                      <select
                        value={selectedWallet}
                        onChange={(event) => setSelectedWallet(event.target.value)}
                      >
                        <option value="all">All wallets</option>
                        {walletBalances.map((wallet) => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="transaction-history-list">
                      {walletTransactions.length > 0 ? (
                        walletTransactions.map((transaction) => {
                          const details = getCategoryDetails(transaction.category);
                          const Icon = details.icon;
                          const linkedWallet = wallets.find(
                            (wallet) => wallet.id === transaction.walletId
                          );

                          return (
                            <div className="transaction-history-row" key={transaction.id}>
                              <div className={`transaction-icon ${details.color}`}>
                                <Icon size={19} />
                              </div>

                              <div className="transaction-details">
                                <h4>{transaction.name}</h4>
                                <p>
                                  {formatDate(transaction.date)} · {linkedWallet?.name || "Unassigned wallet"}
                                </p>
                              </div>

                              <span className="history-category">
                                {transaction.category}
                              </span>

                              <strong className={`transaction-amount ${
                                transaction.type === "income" ? "income-amount" : ""
                              }`}>
                                {transaction.type === "income" ? "+" : "−"}
                                {formatMoney(transaction.amount)}
                              </strong>

                              <button
                                className="delete-transaction"
                                onClick={() => deleteTransaction(transaction.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="transaction-empty-state">
                          <div><Wallet size={23} /></div>
                          <h3>No wallet transactions yet</h3>
                          <p>Add a transaction and select a wallet to see it here.</p>
                          {wallets.length > 0 && (
                            <button className="add-transaction" onClick={openModal}>
                              <Plus size={17} />
                              Add Transaction
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ANALYTICS PAGE */}
              {activePage === "Analytics" && (
                <section className="transactions-page analytics-page">
                  <div className="transactions-page-heading">
                    <div>
                      <p className="eyebrow">FINANCIAL PERFORMANCE</p>
                      <h1>Your <span>Analytics.</span></h1>
                      <p className="welcome-description">
                        Understand your income, expenses and savings.
                      </p>
                    </div>

                    <select
                      className="analytics-period-select"
                      value={analyticsPeriod}
                      onChange={(event) => setAnalyticsPeriod(event.target.value)}
                    >
                      <option value="all">All Time</option>
                      <option value="month">This Month</option>
                      <option value="week">Last 7 Days</option>
                    </select>
                  </div>

                  <div className="transaction-summary-grid">
                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Income</span>
                      <strong className="summary-income">{formatMoney(analyticsIncome)}</strong>
                      <span className="summary-note">Selected period</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Expenses</span>
                      <strong className="summary-expense">{formatMoney(analyticsExpenses)}</strong>
                      <span className="summary-note">Selected period</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Net Savings</span>
                      <strong className={analyticsSavings >= 0 ? "summary-income" : "summary-expense"}>
                        {formatMoney(analyticsSavings)}
                      </strong>
                      <span className="summary-note">Income minus expenses</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Transactions</span>
                      <strong>{analyticsTransactions.length}</strong>
                      <span className="summary-note">Recorded activity</span>
                    </div>
                  </div>

                  <div className="panel analytics-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Income vs Expenses</h3>
                        <p>Compare your money coming in and going out</p>
                      </div>
                    </div>

                    <div className="analytics-comparison">
                      <div className="analytics-comparison-item">
                        <div className="analytics-comparison-heading">
                          <span>Income</span>
                          <strong className="summary-income">{formatMoney(analyticsIncome)}</strong>
                        </div>

                        <div className="analytics-track">
                          <div
                            className="analytics-income-bar"
                            style={{ width: `${incomePercentage}%` }}
                          />
                        </div>

                        <span className="analytics-percentage">
                          {incomePercentage.toFixed(1)}% of total activity
                        </span>
                      </div>

                      <div className="analytics-comparison-item">
                        <div className="analytics-comparison-heading">
                          <span>Expenses</span>
                          <strong className="summary-expense">{formatMoney(analyticsExpenses)}</strong>
                        </div>

                        <div className="analytics-track">
                          <div
                            className="analytics-expense-bar"
                            style={{ width: `${expensePercentage}%` }}
                          />
                        </div>

                        <span className="analytics-percentage">
                          {expensePercentage.toFixed(1)}% of total activity
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="panel analytics-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Expense Breakdown</h3>
                        <p>See where your money is being spent</p>
                      </div>

                      <span className="analytics-total-label">
                        {formatMoney(totalCategoryExpenses)}
                      </span>
                    </div>

                    {expenseCategories.length > 0 ? (
                      <div className="analytics-category-list">
                        {expenseCategories.map((category) => {
                          const percentage =
                            totalCategoryExpenses > 0
                              ? (category.amount / totalCategoryExpenses) * 100
                              : 0;

                          const details = getCategoryDetails(category.name);
                          const Icon = details.icon;

                          return (
                            <div className="analytics-category-row" key={category.name}>
                              <div className={`transaction-icon ${details.color}`}>
                                <Icon size={18} />
                              </div>

                              <div className="analytics-category-info">
                                <div className="analytics-category-heading">
                                  <strong>{category.name}</strong>
                                  <span>{percentage.toFixed(1)}%</span>
                                </div>

                                <div className="analytics-track">
                                  <div
                                    className="analytics-category-bar"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>

                              <strong className="analytics-category-amount">
                                {formatMoney(category.amount)}
                              </strong>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="transaction-empty-state">
                        <div><ChartNoAxesCombined size={23} /></div>
                        <h3>No expense data available</h3>
                        <p>Add expense transactions to see your category breakdown.</p>
                      </div>
                    )}
                  </div>

                  <div className="panel analytics-insight">
                    <div className="ai-symbol">
                      <BrainCircuit size={23} />
                    </div>

                    <div>
                      <h3>Your Financial Summary</h3>
                      <p>
                        {analyticsTransactions.length === 0
                          ? "Start recording transactions to understand your financial activity."
                          : analyticsSavings >= 0
                            ? `You have a positive net balance of ${formatMoney(analyticsSavings)} in the selected period.`
                            : `Your expenses are higher than your income by ${formatMoney(Math.abs(analyticsSavings))} in the selected period.`}
                      </p>

                      {expenseCategories[0] && (
                        <p>
                          Your highest expense category is{" "}
                          <strong>{expenseCategories[0].name}</strong>, with{" "}
                          <strong>{formatMoney(expenseCategories[0].amount)}</strong> spent.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* BUDGETS PAGE */}
              {activePage === "Budgets" && (
                <section className="transactions-page budgets-page">
                  <div className="transactions-page-heading">
                    <div>
                      <p className="eyebrow">PLAN YOUR SPENDING</p>
                      <h1>Monthly <span>Budgets.</span></h1>
                      <p className="welcome-description">
                        Set category-wise spending limits and track your expenses.
                      </p>
                    </div>

                    <button
                      className="add-transaction"
                      onClick={() => {
                        setEditingBudgetId(null);
                        setBudgetForm({ category: "Shopping", limit: "" });
                        setShowBudgetModal(true);
                      }}
                    >
                      <Plus size={19} />
                      Add Budget
                    </button>
                  </div>

                  <div className="transaction-summary-grid">
                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Budget</span>
                      <strong>{formatMoney(totalBudgetLimit)}</strong>
                      <span className="summary-note">Monthly spending limit</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Total Spent</span>
                      <strong className="summary-expense">{formatMoney(totalBudgetSpent)}</strong>
                      <span className="summary-note">Current month expenses</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Remaining Budget</span>
                      <strong className={totalBudgetRemaining >= 0 ? "summary-income" : "summary-expense"}>
                        {formatMoney(totalBudgetRemaining)}
                      </strong>
                      <span className="summary-note">Budget minus spending</span>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Budget Used</span>
                      <strong>{overallBudgetPercentage.toFixed(1)}%</strong>
                      <span className="summary-note">Of monthly budget</span>
                    </div>
                  </div>

                  <div className="panel analytics-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Overall Budget Progress</h3>
                        <p>Your spending across all budget categories</p>
                      </div>
                      <Target size={22} />
                    </div>

                    <div className="budget-total">
                      <h2>{formatMoney(totalBudgetSpent)}</h2>
                      <p>spent out of {formatMoney(totalBudgetLimit)}</p>
                    </div>

                    <div className="analytics-track budget-overall-track">
                      <div
                        className="analytics-category-bar"
                        style={{
                          width: `${Math.min(overallBudgetPercentage, 100)}%`,
                          background: overallBudgetPercentage > 100 ? "#ef4444" : undefined,
                        }}
                      />
                    </div>

                    <div className="budget-footer">
                      <span>{overallBudgetPercentage.toFixed(1)}% used</span>
                      <span>
                        {totalBudgetRemaining >= 0
                          ? `${formatMoney(totalBudgetRemaining)} remaining`
                          : `${formatMoney(Math.abs(totalBudgetRemaining))} over budget`}
                      </span>
                    </div>

                    <div className={`budget-tip ${
                      overallBudgetPercentage >= 80 ? "budget-warning" : ""
                    }`}>
                      <Sparkles size={17} />
                      <p>
                        {overallBudgetPercentage > 100
                          ? "Your total spending has exceeded your monthly budget."
                          : overallBudgetPercentage >= 80
                            ? "You are getting close to your overall budget limit."
                            : "Your spending is within your overall monthly budget."}
                      </p>
                    </div>
                  </div>

                  <div className="panel analytics-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Category Budgets</h3>
                        <p>Track spending limits for each category</p>
                      </div>

                      <span className="analytics-total-label">
                        {budgetDetails.length} categories
                      </span>
                    </div>

                    {budgetDetails.length > 0 ? (
                      <div className="budget-category-list">
                        {budgetDetails.map((budget) => {
                          const details = getCategoryDetails(budget.category);
                          const Icon = details.icon;

                          return (
                            <div
                              className="budget-category-card"
                              key={budget.id}
                              style={{
                                padding: 20,
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 14,
                                marginBottom: 14,
                                background: "rgba(255,255,255,0.02)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  flexWrap: "wrap",
                                }}
                              >
                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                }}>
                                  <div className={`transaction-icon ${details.color}`}>
                                    <Icon size={19} />
                                  </div>

                                  <div>
                                    <h3 style={{ margin: 0 }}>{budget.category}</h3>
                                    <p className="summary-note">
                                      {formatMoney(budget.spent)} spent of {formatMoney(budget.limit)}
                                    </p>
                                  </div>
                                </div>

                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                }}>
                                  <strong className={
                                    budget.exceeded ? "summary-expense" : "summary-income"
                                  }>
                                    {budget.percentage.toFixed(1)}%
                                  </strong>

                                  <button
                                    className="delete-transaction"
                                    title="Edit budget"
                                    onClick={() => editBudget(budget)}
                                  >
                                    <Settings size={16} />
                                  </button>

                                  <button
                                    className="delete-transaction"
                                    title="Delete budget"
                                    onClick={() => deleteBudget(budget.id)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              <div className="analytics-track" style={{ marginTop: 18 }}>
                                <div
                                  className="analytics-category-bar"
                                  style={{
                                    width: `${Math.min(budget.percentage, 100)}%`,
                                    background: budget.exceeded
                                      ? "#ef4444"
                                      : budget.nearLimit
                                        ? "#f59e0b"
                                        : undefined,
                                  }}
                                />
                              </div>

                              <div className="budget-footer">
                                <span>
                                  {budget.exceeded
                                    ? "Budget exceeded"
                                    : budget.nearLimit
                                      ? "Almost at limit"
                                      : "Within budget"}
                                </span>

                                <span>
                                  {budget.remaining >= 0
                                    ? `${formatMoney(budget.remaining)} left`
                                    : `${formatMoney(Math.abs(budget.remaining))} over`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="transaction-empty-state">
                        <div><Target size={23} /></div>
                        <h3>No budgets created yet</h3>
                        <p>Create your first category budget.</p>
                        <button
                          className="add-transaction"
                          onClick={() => setShowBudgetModal(true)}
                        >
                          <Plus size={17} />
                          Create Budget
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* AI ASSISTANT */}
              {activePage === "AI Assistant" && (
                <section className="transactions-page">
                  <div className="transactions-page-heading">
                    <div>
                      <p className="eyebrow">SMART FINANCIAL INSIGHTS</p>
                      <h1>SmartKharcha <span>AI Assistant.</span></h1>
                      <p className="welcome-description">
                        A summary based on your recorded financial activity.
                      </p>
                    </div>
                  </div>

                  <div className="panel analytics-insight">
                    <div className="ai-symbol">
                      <BrainCircuit size={23} />
                    </div>
                    <div>
                      <h3>Your Financial Summary</h3>
                      <p>
                        {transactions.length === 0
                          ? "Add transactions to get insights based on your financial activity."
                          : `You have recorded ${transactions.length} transactions. Your total income is ${formatMoney(totalIncome)} and your total expenses are ${formatMoney(totalExpenses)}.`}
                      </p>
                    </div>
                  </div>

                  <div className="transaction-summary-grid">
                    <div className="transaction-summary-card">
                      <span className="summary-label">Net Savings</span>
                      <strong className={totalSavings >= 0 ? "summary-income" : "summary-expense"}>
                        {formatMoney(totalSavings)}
                      </strong>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Highest Expense Category</span>
                      <strong>{expenseCategories[0]?.name || "No data"}</strong>
                    </div>

                    <div className="transaction-summary-card">
                      <span className="summary-label">Budget Used</span>
                      <strong>{overallBudgetPercentage.toFixed(1)}%</strong>
                    </div>
                  </div>
                </section>
              )}

              {/* SETTINGS */}
              {activePage === "Settings" && (
                <section className="transactions-page">
                  <div className="transactions-page-heading">
                    <div>
                      <p className="eyebrow">ACCOUNT PREFERENCES</p>
                      <h1>Account <span>Settings.</span></h1>
                      <p className="welcome-description">
                        Manage your SmartKharcha account.
                      </p>
                    </div>
                  </div>

                  <div className="panel analytics-panel">
                    <h3>Personal Account</h3>
                    <p className="summary-note">Name: {user.name}</p>
                    <p className="summary-note">Email: {user.email}</p>

                    <button
                      className="add-transaction"
                      style={{ marginTop: 20 }}
                      onClick={handleLogout}
                    >
                      <LogOut size={17} />
                      Logout
                    </button>
                  </div>
                </section>
              )}

              {/* OVERVIEW PAGE */}
              {activePage === "Overview" && (
                <div className="overview-page">
                  <section className="welcome-section overview-welcome">
                    <div>
                      <p className="eyebrow">YOUR FINANCIAL DASHBOARD</p>
                      <h1>
                        Your money, <span>under control.</span>
                      </h1>
                      <p className="welcome-description">
                        Track your spending, manage your budget and make smarter financial decisions.
                      </p>
                    </div>

                    <button className="add-transaction" onClick={openModal}>
                      <Plus size={19} />
                      Add Transaction
                    </button>
                  </section>

                  <section className="stats-grid overview-stats-grid">
                    {stats.map((stat) => {
                      const Icon = stat.icon;

                      return (
                        <div className="stat-card" key={stat.title}>
                          <div className="stat-top">
                            <div className={`stat-icon ${stat.color}`}>
                              <Icon size={20} />
                            </div>
                            <span className="stat-menu">•••</span>
                          </div>

                          <p>{stat.title}</p>
                          <h2>{formatMoney(stat.amount)}</h2>

                          <div className="stat-bottom">
                            <span className="growth positive">
                              <TrendingUp size={14} />
                              Live
                            </span>
                            <span>account totals</span>
                          </div>
                        </div>
                      );
                    })}
                  </section>

                  <section className="analytics-grid overview-analytics-grid">
                    <div className="panel chart-panel">
                      <div className="panel-header">
                        <div>
                          <h3>Financial Overview</h3>
                          <p>Your recorded income and expenses</p>
                        </div>
                        <CalendarDays size={20} />
                      </div>

                      <div className="analytics-comparison">
                        <div className="analytics-comparison-item">
                          <div className="analytics-comparison-heading">
                            <span>Income</span>
                            <strong className="summary-income">
                              {formatMoney(totalIncome)}
                            </strong>
                          </div>
                          <div className="analytics-track">
                            <div
                              className="analytics-income-bar"
                              style={{
                                width: `${
                                  totalIncome + totalExpenses > 0
                                    ? (totalIncome / (totalIncome + totalExpenses)) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="analytics-comparison-item">
                          <div className="analytics-comparison-heading">
                            <span>Expenses</span>
                            <strong className="summary-expense">
                              {formatMoney(totalExpenses)}
                            </strong>
                          </div>
                          <div className="analytics-track">
                            <div
                              className="analytics-expense-bar"
                              style={{
                                width: `${
                                  totalIncome + totalExpenses > 0
                                    ? (totalExpenses / (totalIncome + totalExpenses)) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="panel ai-panel">
                      <div className="ai-heading">
                        <div className="ai-symbol">
                          <BrainCircuit size={23} />
                        </div>
                        <span className="ai-status">FINANCIAL INSIGHTS</span>
                      </div>

                      <h3>Your Financial Summary</h3>

                      <p className="ai-description">
                        Based on your saved transactions.
                      </p>

                      <div className="ai-insight">
                        <div className="insight-icon">
                          <TrendingUp size={17} />
                        </div>
                        <div>
                          <h4>Net savings</h4>
                          <p>
                            Your current income minus expenses is {formatMoney(totalSavings)}.
                          </p>
                        </div>
                      </div>

                      <div className="ai-insight">
                        <div className="insight-icon orange-insight">
                          <ShoppingBag size={17} />
                        </div>
                        <div>
                          <h4>Spending category</h4>
                          <p>
                            {expenseCategories[0]
                              ? `${expenseCategories[0].name} is your highest expense category.`
                              : "Add expenses to see your spending categories."}
                          </p>
                        </div>
                      </div>

                      <button
                        className="ai-button"
                        onClick={() => setActivePage("AI Assistant")}
                      >
                        <Sparkles size={17} />
                        Explore AI Insights
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </section>

                  <section className="bottom-grid overview-bottom-grid">
                    <div className="panel transactions-panel">
                      <div className="panel-header">
                        <div>
                          <h3>Recent Transactions</h3>
                          <p>Your latest financial activities</p>
                        </div>

                        <button
                          className="view-all"
                          onClick={() => setActivePage("Transactions")}
                        >
                          View all
                          <ArrowUpRight size={15} />
                        </button>
                      </div>

                      <div className="transaction-list">
                        {recentTransactions.length > 0 ? (
                          recentTransactions.map((transaction) => {
                            const details = getCategoryDetails(transaction.category);
                            const Icon = details.icon;

                            return (
                              <div className="transaction-row" key={transaction.id}>
                                <div className={`transaction-icon ${details.color}`}>
                                  <Icon size={19} />
                                </div>

                                <div className="transaction-details">
                                  <h4>{transaction.name}</h4>
                                  <p>{formatDate(transaction.date)}</p>
                                </div>

                                <div className="transaction-category">
                                  {transaction.category}
                                </div>

                                <div className={`transaction-amount ${
                                  transaction.type === "income" ? "income-amount" : ""
                                }`}>
                                  {transaction.type === "income" ? "+" : "−"}
                                  {formatMoney(transaction.amount)}
                                </div>

                                <button
                                  className="delete-transaction"
                                  title="Delete transaction"
                                  onClick={() => deleteTransaction(transaction.id)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="transaction-empty-state">
                            <div><Wallet size={23} /></div>
                            <h3>No transactions yet</h3>
                            <p>Add your first transaction to see it here.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="panel budget-panel">
                      <div className="panel-header">
                        <div>
                          <h3>Monthly Budget</h3>
                          <p>Your spending limits</p>
                        </div>
                        <Target size={21} />
                      </div>

                      <div className="budget-total">
                        <h2>{formatMoney(totalBudgetSpent)}</h2>
                        <p>of {formatMoney(totalBudgetLimit)} spent</p>
                      </div>

                      <div className="budget-progress">
                        <div
                          style={{
                            width: `${Math.min(overallBudgetPercentage, 100)}%`,
                            background: overallBudgetPercentage > 100 ? "#ef4444" : undefined,
                          }}
                        />
                      </div>

                      <div className="budget-footer">
                        <span>{overallBudgetPercentage.toFixed(1)}% used</span>
                        <span>{formatMoney(Math.max(totalBudgetRemaining, 0))} left</span>
                      </div>

                      <div className={`budget-tip ${
                        overallBudgetPercentage >= 80 ? "budget-warning" : ""
                      }`}>
                        <Sparkles size={17} />
                        <p>
                          {budgets.length === 0
                            ? "Create a budget to start tracking your spending."
                            : overallBudgetPercentage > 100
                              ? "Your spending has exceeded your monthly budget."
                              : overallBudgetPercentage >= 80
                                ? "You are getting close to your monthly budget limit."
                                : "You're on track with your monthly budget."}
                        </p>
                      </div>

                      <button
                        className="manage-budget"
                        onClick={() => setActivePage("Budgets")}
                      >
                        Manage Budget
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </section>

                  <footer className="footer">
                    <p>© 2026 SmartKharcha. Smart finance, smarter life.</p>
                    <p>
                      Made with <span>♥</span> for better financial health.
                    </p>
                  </footer>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ADD TRANSACTION MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="transaction-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Add Transaction</h2>
                <p>Enter your transaction details below.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction}>
              <label>Transaction Type</label>

              <div className="type-selector">
                <button
                  type="button"
                  className={
                    formData.type === "expense"
                      ? "type-option selected expense-selected"
                      : "type-option"
                  }
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: "expense",
                      category: "Shopping",
                    })
                  }
                >
                  <ArrowUpRight size={18} />
                  Expense
                </button>

                <button
                  type="button"
                  className={
                    formData.type === "income"
                      ? "type-option selected income-selected"
                      : "type-option"
                  }
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: "income",
                      category: "Income",
                    })
                  }
                >
                  <ArrowDownRight size={18} />
                  Income
                </button>
              </div>

              <label>Select Wallet</label>
              <select
                className="modal-input"
                value={formData.walletId}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    walletId: event.target.value,
                  })
                }
                required
              >
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>

              <label>Description</label>
              <input
                className="modal-input"
                type="text"
                placeholder="e.g. Grocery shopping"
                value={formData.name}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    name: event.target.value,
                  })
                }
                required
              />

              <label>Amount (₹)</label>
              <input
                className="modal-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    amount: event.target.value,
                  })
                }
                required
              />

              <label>Category</label>
              <select
                className="modal-input"
                value={formData.category}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    category: event.target.value,
                  })
                }
              >
                {formData.type === "expense" ? (
                  <>
                    <option>Shopping</option>
                    <option>Food</option>
                    <option>Travel</option>
                    <option>Utilities</option>
                    <option>Other</option>
                  </>
                ) : (
                  <>
                    <option>Income</option>
                    <option>Other</option>
                  </>
                )}
              </select>

              <label>Date</label>
              <input
                className="modal-input"
                type="date"
                value={formData.date}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    date: event.target.value,
                  })
                }
                required
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  <Plus size={17} />
                  {saving ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD WALLET MODAL */}
      {showWalletModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowWalletModal(false)}
        >
          <div
            className="transaction-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Add New Wallet</h2>
                <p>Create a wallet to track its balance.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowWalletModal(false)}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleAddWallet}>
              <label>Wallet Name</label>
              <input
                className="modal-input"
                type="text"
                placeholder="e.g. Savings Account"
                value={walletForm.name}
                onChange={(event) =>
                  setWalletForm({
                    ...walletForm,
                    name: event.target.value,
                  })
                }
                required
              />

              <label>Wallet Type</label>
              <select
                className="modal-input"
                value={walletForm.type}
                onChange={(event) =>
                  setWalletForm({
                    ...walletForm,
                    type: event.target.value,
                  })
                }
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Account</option>
                <option value="upi">UPI / Digital Wallet</option>
              </select>

              <label>Starting Balance (₹)</label>
              <input
                className="modal-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter current balance"
                value={walletForm.balance}
                onChange={(event) =>
                  setWalletForm({
                    ...walletForm,
                    balance: event.target.value,
                  })
                }
                required
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowWalletModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  <Plus size={17} />
                  {saving ? "Saving..." : "Save Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT BUDGET MODAL */}
      {showBudgetModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowBudgetModal(false);
            setEditingBudgetId(null);
          }}
        >
          <div
            className="transaction-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>{editingBudgetId ? "Edit Budget" : "Set Category Budget"}</h2>
                <p>Add or update your monthly spending limit.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setShowBudgetModal(false);
                  setEditingBudgetId(null);
                }}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget}>
              <label>Budget Category</label>
              <select
                className="modal-input"
                value={budgetForm.category}
                onChange={(event) =>
                  setBudgetForm({
                    ...budgetForm,
                    category: event.target.value,
                  })
                }
                required
              >
                <option value="Shopping">Shopping</option>
                <option value="Food">Food</option>
                <option value="Travel">Travel</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>

              <label>Monthly Limit (₹)</label>
              <input
                className="modal-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter monthly budget"
                value={budgetForm.limit}
                onChange={(event) =>
                  setBudgetForm({
                    ...budgetForm,
                    limit: event.target.value,
                  })
                }
                required
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowBudgetModal(false);
                    setEditingBudgetId(null);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  <Target size={17} />
                  {saving ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
