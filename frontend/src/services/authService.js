import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { call, callSilent } from "./serviceUtils.js";
import { setAuthSession } from "../utils/authStorage.js";

export const login = (email, password) =>
  call(
    async () => {
      const { data } = await api.post("/auth/login", { email, password });
      if (data?.token) {
        setAuthSession(data);
      }
      return data;
    },
    async () => {
      const response = await localDb.auth.login({ email, password });
      if (response?.token) {
        setAuthSession(response);
      }
      return response;
    },
  );

export const registerStore = (payload) =>
  call(
    async () => {
      const { data } = await api.post("/auth/register-store", payload);
      if (data?.token) {
        setAuthSession(data);
      }
      return data;
    },
    async () => {
      const response = await localDb.auth.registerStore(payload);
      if (response?.token) {
        setAuthSession(response);
      }
      return response;
    },
  );

export const checkEmailAvailability = (email, storeName = "", exceptUserId = null) =>
  callSilent(
    async () => {
      const { data } = await api.post("/auth/check-email", {
        email,
        storeName,
        exceptUserId,
      });
      return data;
    },
    () => localDb.auth.checkEmail({ email, storeName, exceptUserId }),
  );
