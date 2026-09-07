import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

export const getStocks = async () => {
  try {
    const response = await api.get("/stocks");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const addOrUpdateStock = async (stockData) => {
  try {
    const response = await api.post("/stocks", stockData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateStockQuantity = async (stockId, payload) => {
  try {
    const response = await api.put(`/stocks/${stockId}`, payload);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
