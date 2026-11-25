
const API_URL = "http://localhost:5000/api";

// AUTH TOKEN
export const getToken = () => {
  return localStorage.getItem("finora_token");
};

// SAVE LOGIN SESSION
const saveAuthSession = (data) => {
  if (data?.token) {
    localStorage.setItem("finora_token", data.token);
  }

  if (data?.user) {
    localStorage.setItem("finora_user", JSON.stringify(data.user));
  }

  return data;
};

// CLEAR LOGIN SESSION
export const clearAuthSession = () => {
  localStorage.removeItem("finora_token");
  localStorage.removeItem("finora_user");
};

// COMMON API REQUEST
export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
    }

    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
};

// AUTH
export const signupUser = async (userData) => {
  const data = await apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  return saveAuthSession(data);
};

export const loginUser = async (userData) => {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  return saveAuthSession(data);
};

export const getCurrentUser = () =>
  apiRequest("/auth/me");

// TRANSACTIONS
export const getTransactions = () =>
  apiRequest("/transactions");

export const addTransactionAPI = (data) =>
  apiRequest("/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateTransactionAPI = (id, data) =>
  apiRequest(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteTransactionAPI = (id) =>
  apiRequest(`/transactions/${id}`, {
    method: "DELETE",
  });

// WALLETS
export const getWallets = () =>
  apiRequest("/wallets");

export const addWalletAPI = (data) =>
  apiRequest("/wallets", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateWalletAPI = (id, data) =>
  apiRequest(`/wallets/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteWalletAPI = (id) =>
  apiRequest(`/wallets/${id}`, {
    method: "DELETE",
  });

// BUDGETS
export const getBudgets = () =>
  apiRequest("/budgets");

export const addBudgetAPI = (data) =>
  apiRequest("/budgets", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBudgetAPI = (id, data) =>
  apiRequest(`/budgets/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteBudgetAPI = (id) =>
  apiRequest(`/budgets/${id}`, {
    method: "DELETE",
  });
