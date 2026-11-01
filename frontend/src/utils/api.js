import axios from "axios";
import { getAuthToken, getAuthSession, clearAuthSession } from "./authStorage.js";

const resolveBaseUrl = () => {
  const raw = String(import.meta.env?.VITE_API_URL || "").trim();
  if (!raw) return "/api";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken() || getAuthSession()?.token;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const reqUrl = String(error?.config?.url || "");
    const isAuthAttempt =
      reqUrl.includes("/auth/login") ||
      reqUrl.includes("/auth/register") ||
      reqUrl.includes("/auth/re-auth");

    if (status === 401 && !isAuthAttempt) {
      const session = getAuthSession();
      if (session?.token && !String(session.token).startsWith("local.")) {
        clearAuthSession({ markLoggedOut: false });
      }
    }
    return Promise.reject(error);
  },
);

export default api;
