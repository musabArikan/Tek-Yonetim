import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getCustomers = () => call(() => localDb.customers.list());

export const getCustomerById = (customerId) =>
  call(() => localDb.customers.getById(customerId));

export const createCustomer = (customerData) =>
  call(() => localDb.customers.create(customerData));

export const deleteCustomer = (customerId) =>
  call(() => localDb.customers.remove(customerId));
