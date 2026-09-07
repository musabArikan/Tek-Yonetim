const AUTH_TOKEN_KEY = "auth_token";
const AUTH_SESSION_KEY = "auth_session";

const isBrowser = () => typeof window !== "undefined";

export const getAuthToken = () => {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getAuthSession = () => {
  if (!isBrowser()) return null;

  const rawValue = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.error("Auth session could not be parsed:", error);
    return null;
  }
};

export const setAuthSession = (session) => {
  if (!isBrowser() || !session?.token) return;

  window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
};

export const clearAuthSession = () => {
  if (!isBrowser()) return;

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_SESSION_KEY);
};
