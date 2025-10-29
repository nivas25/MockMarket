import axios, { type InternalAxiosRequestConfig } from "axios";
import { url as API_BASE_URL } from "../config";

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
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
