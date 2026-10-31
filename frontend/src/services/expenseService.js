import { localDb, EXPENSE_CATEGORIES } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export { EXPENSE_CATEGORIES };

export const getExpenses = (params = {}) =>
  call(() => localDb.expenses.list(params));

export const createExpense = (data) =>
  call(() => localDb.expenses.create(data));

export const updateExpense = (id, data) =>
  call(() => localDb.expenses.update(id, data));

export const deleteExpense = (id) =>
  call(() => localDb.expenses.remove(id));

export const getMonthlyStoreSummary = (params = {}) =>
  call(() => localDb.expenses.monthlySummary(params));

export const getStoreProfile = () =>
  call(() => localDb.store.getProfile());

export const updateStoreProfile = (data) =>
  call(() => localDb.store.updateProfile(data));

