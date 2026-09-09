import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

export const getTransfers = async (params = {}) => {
  try {
    const response = await api.get("/transfers", { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getTransferById = async (transferId) => {
  try {
    const response = await api.get(`/transfers/${transferId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createTransfer = async (transferData) => {
  try {
    const response = await api.post("/transfers", transferData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateTransferStatus = async (transferId, status, notes) => {
  try {
    const response = await api.patch(`/transfers/${transferId}/status`, { status, notes });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteTransfer = async (transferId) => {
  try {
    const response = await api.delete(`/transfers/${transferId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
