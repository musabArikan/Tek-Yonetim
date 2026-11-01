import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getCustomers = (params = {}) =>
  call(
    async () => {
      const { data } = await api.get("/customers", { params });
      return Array.isArray(data) ? data : [];
    },
    () => localDb.customers.list(),
  );

export const getCustomerById = (customerId) =>
  call(
    async () => {
      const { data } = await api.get(`/customers/${customerId}`);
      return data;
    },
    () => localDb.customers.getById(customerId),
  );

export const createCustomer = (customerData) =>
  call(
    async () => {
      const { data } = await api.post("/customers", customerData);
      return data;
    },
    () => localDb.customers.create(customerData),
  );

export const deleteCustomer = (customerId) =>
  call(
    async () => {
      const { data } = await api.delete(`/customers/${customerId}`);
      return data;
    },
    () => localDb.customers.remove(customerId),
  );
