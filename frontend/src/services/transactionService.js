import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getTransactions = () => call(() => localDb.transactions.list());

export const createTransaction = (transactionData) =>
  call(() => localDb.transactions.create(transactionData));

export const getCustomerTransactions = (customerId) =>
  call(() => localDb.transactions.listByCustomer(customerId));
