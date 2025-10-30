// Central API base URL
// Prefer NEXT_PUBLIC_API_URL when defined; falls back to local dev server
export const url =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  "http://localhost:5000";
