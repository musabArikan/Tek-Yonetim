import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

export const getShipments = async (params = {}) => {
  try {
    const response = await api.get("/shipments", { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getShipmentsByDate = async (date) => {
  try {
    const response = await api.get("/shipments", { params: { date } });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getShipmentById = async (shipmentId) => {
  try {
    const response = await api.get(`/shipments/${shipmentId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createShipment = async (shipmentData) => {
  try {
    const response = await api.post("/shipments", shipmentData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateShipment = async (shipmentId, shipmentData) => {
  try {
    const response = await api.put(`/shipments/${shipmentId}`, shipmentData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteShipment = async (shipmentId) => {
  try {
    const response = await api.delete(`/shipments/${shipmentId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
