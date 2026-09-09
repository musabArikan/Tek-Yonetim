import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

// ─── Installment (Taksit/Senet) ──────────────────────────────────────────────

export const getInstallments = async (params = {}) => {
  try {
    const response = await api.get("/installments", { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getOverdueInstallments = async () => {
  try {
    const response = await api.get("/installments/overdue");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getCustomerInstallmentSummary = async (customerId) => {
  try {
    const response = await api.get(`/installments/customer/${customerId}/summary`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getInstallmentById = async (installmentId) => {
  try {
    const response = await api.get(`/installments/${installmentId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createInstallment = async (installmentData) => {
  try {
    const response = await api.post("/installments", installmentData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const markInstallmentPaid = async (installmentId, paidDate) => {
  try {
    const response = await api.patch(`/installments/${installmentId}/paid`, { paidDate });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteInstallment = async (installmentId) => {
  try {
    const response = await api.delete(`/installments/${installmentId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ─── Collection (Tahsilat/Kasa) ──────────────────────────────────────────────

export const getCollections = async (params = {}) => {
  try {
    const response = await api.get("/collections", { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getCollectionById = async (collectionId) => {
  try {
    const response = await api.get(`/collections/${collectionId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createCollection = async (collectionData) => {
  try {
    const response = await api.post("/collections", collectionData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteCollection = async (collectionId) => {
  try {
    const response = await api.delete(`/collections/${collectionId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
