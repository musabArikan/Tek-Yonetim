import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { callSilent } from "./serviceUtils.js";

const SCOPE_MAP = {
  personeller: "userManagement",
  userManagement: "userManagement",
  raporlar: "reports",
  reports: "reports",
  magazam: "myStore",
  myStore: "myStore",
};

/**
 * Sayfa re-auth doğrulaması.
 */
export const verifyPagePassword = (page, password) =>
  callSilent(
    async () => {
      const scope = SCOPE_MAP[page] || "userManagement";
      const { data } = await api.post("/auth/re-auth", { scope, password });
      return { authorized: Boolean(data?.verified), ...data };
    },
    () => localDb.auth.verifyPagePassword({ page, password }),
  );

/**
 * Admin: bir kullanıcı için sayfa şifresi atar (boş string = kilit kaldır).
 */
export const setUserPagePassword = (userId, page, password) =>
  callSilent(
    async () => {
      const scope = SCOPE_MAP[page] || "userManagement";
      const clear = !password || String(password).trim() === "";
      const { data } = await api.patch(`/users/${userId}/page-password`, {
        scope,
        password: password || "",
        clear,
      });
      return data;
    },
    () => localDb.auth.setPagePassword(userId, { page, password }),
  );
