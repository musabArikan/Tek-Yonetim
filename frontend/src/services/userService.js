import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

export const getUsers = async () => {
  try {
    const response = await api.get("/users");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const createUser = async (payload) => {
  try {
    const response = await api.post("/users", payload);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateUser = async (userId, payload) => {
  try {
    const response = await api.put(`/users/${userId}`, payload);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const changePassword = async (userId, newPassword) => {
  try {
    const response = await api.patch(`/users/${userId}/password`, {
      newPassword,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
