// src/Utils/axiosInstance.js
import axios from "axios";

/**
 * Axios instance for the app.
 * - Reads base URL from env (REACT_APP_API_BASE) or falls back to localhost.
 * - Automatically attaches JWT from localStorage (`jwt` key).
 * - Handles 401 responses by clearing auth and redirecting to /login (with optional redirect).
 * - Sets a reasonable timeout.
 */

const API_BASE = (() => {
  try {
    if (typeof window !== "undefined") {
      return window.__REACT_APP_API_BASE__ || window.REACT_APP_API_BASE || "http://localhost:8080";
    }
  } catch (e) { /* ignore */ }
  return "http://localhost:8080";
})();

const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000, // 15s timeout
});

// Request: attach token if present
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("jwt");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response: global error handling
axiosInstance.interceptors.response.use(
  (resp) => resp,
  (error) => {
    // If unauthorized, clear local auth and redirect to login (preserve current path)
    const status = error?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        localStorage.removeItem("role");
      } catch (e) {}
      // Redirect to login, include redirect back to current path
      if (typeof window !== "undefined") {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?redirect=${redirect}`;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
