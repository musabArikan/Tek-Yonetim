import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

export const getCustomers = async () => {
  try {
    const response = await api.get("/customers");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getCustomerById = async (customerId) => {
  try {
    const response = await api.get(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createCustomer = async (customerData) => {
  try {
    const response = await api.post("/customers", customerData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteCustomer = async (customerId) => {
  try {
    const response = await api.delete(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
