import api from "../utils/api.js";
import { localDb, EXPENSE_CATEGORIES } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";
import { getAuthSession, setAuthSession } from "../utils/authStorage.js";

export { EXPENSE_CATEGORIES };

export const getExpenses = (params = {}) =>
  call(
    async () => {
      const { data } = await api.get("/expenses", { params });
      return Array.isArray(data) ? data : [];
    },
    () => localDb.expenses.list(params),
  );

export const createExpense = (payload) =>
  call(
    async () => {
      const { data } = await api.post("/expenses", payload);
      return data;
    },
    () => localDb.expenses.create(payload),
  );

export const updateExpense = (id, payload) =>
  call(
    async () => {
      const { data } = await api.put(`/expenses/${id}`, payload);
      return data;
    },
    () => localDb.expenses.update(id, payload),
  );

export const deleteExpense = (id) =>
  call(
    async () => {
      const { data } = await api.delete(`/expenses/${id}`);
      return data;
    },
    () => localDb.expenses.remove(id),
  );

export const getMonthlyStoreSummary = (params = {}) =>
  call(
    async () => {
      const { data } = await api.get("/expenses/monthly-summary", { params });
      return data;
    },
    () => localDb.expenses.monthlySummary(params),
  );

export const getStoreProfile = () =>
  call(
    async () => {
      const { data } = await api.get("/store/profile");
      return data;
    },
    () => localDb.store.getProfile(),
  );

export const updateStoreProfile = (payload) =>
  call(
    async () => {
      const { data } = await api.put("/store/profile", payload);
      if (data?.session?.token) {
        const current = getAuthSession();
        setAuthSession({
          ...current,
          ...data.session,
        });
      }
      return data;
    },
    () => localDb.store.updateProfile(payload),
  );
