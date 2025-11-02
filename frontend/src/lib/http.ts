import axios, { type InternalAxiosRequestConfig } from "axios";
import { url as API_BASE_URL } from "../config";

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // Increased to 20s for stock movers queries
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT from localStorage, if present
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("authToken") || localStorage.getItem("token");
    if (token) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headers: any = config.headers || {};
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers;
    }
  }
  return config;
});

// Basic error logging
http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Silently ignore cancellation errors triggered by AbortController
    // Axios v1 uses CanceledError with code ERR_CANCELED
    if (
      axios.isCancel?.(error) ||
      error?.code === "ERR_CANCELED" ||
      error?.name === "CanceledError" ||
      error?.message === "canceled"
    ) {
      return Promise.reject(error);
    }

    if (error.response) {
      console.error(
        "HTTP error",
        error.response.status,
        error.response.data || error.message
      );
    } else {
      console.error("Network error", error.message);
    }
    return Promise.reject(error);
  }
);

export default http;
