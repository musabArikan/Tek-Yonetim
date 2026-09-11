import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

export const getTransactions = async () => {
  try {
    const response = await api.get("/transactions");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createTransaction = async (transactionData) => {
  try {
    const response = await api.post("/transactions", transactionData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getCustomerTransactions = async (customerId) => {
  try {
    const response = await api.get(`/transactions/customer/${customerId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

