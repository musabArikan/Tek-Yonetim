import api from "../utils/api";

/**
 * Sayfa re-auth doğrulaması: kullanıcının pagePasswords[page] ile şifreyi karşılaştırır.
 * @param {string} page - "finans" | "stok" | "raporlar" | "envanter" | "transferler"
 * @param {string} password
 * @returns {{ authorized: boolean, noPassword?: boolean }}
 */
export const verifyPagePassword = async (page, password) => {
  const response = await api.post("/auth/re-auth", { page, password });
  return response.data;
};

/**
 * Admin: bir kullanıcı için sayfa şifresi atar (boş string = kilit kaldır).
 * @param {string} userId
 * @param {string} page
 * @param {string} password
 */
export const setUserPagePassword = async (userId, page, password) => {
  const response = await api.patch(`/users/${userId}/page-password`, { page, password });
  return response.data;
};
