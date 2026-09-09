import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

export const getBranches = async () => {
  try {
    const response = await api.get("/branches");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createBranch = async (branchData) => {
  try {
    const response = await api.post("/branches", branchData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateBranch = async (branchId, branchData) => {
  try {
    const response = await api.put(`/branches/${branchId}`, branchData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteBranch = async (branchId) => {
  try {
    const response = await api.delete(`/branches/${branchId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
