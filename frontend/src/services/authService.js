import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";
import { setAuthSession } from "../utils/authStorage.js";

export const login = (email, password) =>
  call(async () => {
    const response = await localDb.auth.login({ email, password });
    if (response?.token) {
      setAuthSession(response);
    }
    return response;
  });

export const registerStore = (payload) =>
  call(async () => {
    const response = await localDb.auth.registerStore(payload);
    if (response?.token) {
      setAuthSession(response);
    }
    return response;
  });

export const checkEmailAvailability = (email, storeName = "", exceptUserId = null) =>
  localDb.auth.checkEmail({ email, storeName, exceptUserId });
