import { localDb } from "../utils/localDb.js";

/**
 * Sayfa re-auth doğrulaması: kullanıcının pagePasswords[page] ile şifreyi karşılaştırır.
 * @param {string} page - "finans" | "stok" | "raporlar" | "envanter" | "transferler"
 * @param {string} password
 * @returns {{ authorized: boolean, noPassword?: boolean }}
 */
export const verifyPagePassword = (page, password) =>
  localDb.auth.verifyPagePassword({ page, password });

/**
 * Admin: bir kullanıcı için sayfa şifresi atar (boş string = kilit kaldır).
 * @param {string} userId
 * @param {string} page
 * @param {string} password
 */
export const setUserPagePassword = (userId, page, password) =>
  localDb.auth.setPagePassword(userId, { page, password });
