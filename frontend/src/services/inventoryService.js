import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

export const getPendingInventory = async () => {
  try {
    const response = await api.get("/inventory");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deliverInventoryItem = async (payload) => {
  try {
    const response = await api.put("/inventory/deliver", payload);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
