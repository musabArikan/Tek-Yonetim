import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getTransactions = (params = {}) =>
  call(
    async () => {
      const { data } = await api.get("/transactions", { params });
      return Array.isArray(data) ? data : [];
    },
    () => localDb.transactions.list(),
  );

export const createTransaction = (transactionData) =>
  call(
    async () => {
      const { data } = await api.post("/transactions", transactionData);
      return data;
    },
    () => localDb.transactions.create(transactionData),
  );

export const getCustomerTransactions = (customerId) =>
  call(
    async () => {
      const { data } = await api.get(`/customers/${customerId}/transactions`);
      return Array.isArray(data) ? data : [];
    },
    () => localDb.transactions.listByCustomer(customerId),
  );
