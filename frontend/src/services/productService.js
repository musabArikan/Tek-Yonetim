import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

// ─── Ürünler ──────────────────────────────────────────────────────────────────

export const getProducts = async () => {
  try {
    const response = await api.get("/products");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createProduct = async (productData) => {
  try {
    const response = await api.post("/products", productData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateProduct = async (id, productData) => {
  try {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteProduct = async (id) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// ─── Stok Hareketleri ────────────────────────────────────────────────────────

export const getStockMovements = async (productId = null) => {
  try {
    const url = productId
      ? `/products/movements/list?productId=${productId}`
      : "/products/movements/list";
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const addStockMovement = async (movementData) => {
  try {
    const response = await api.post("/products/movements/add", movementData);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const cancelStockMovement = async (movementId) => {
  try {
    const response = await api.patch(`/products/movements/${movementId}/cancel`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
