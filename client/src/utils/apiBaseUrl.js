const currentHost = typeof window === "undefined" ? "localhost" : window.location.hostname;

export const API_BASE_URL = import.meta.env.VITE_API_URL?.trim()
  || `http://${currentHost}:8000/api`;

export const API_ORIGIN = new URL(
  API_BASE_URL,
  typeof window === "undefined" ? "http://localhost:5173" : window.location.origin,
).origin;
