import api from "../utils/api";
import { handleApiError } from "../utils/apiError";
import { setAuthSession } from "../utils/authStorage";

export const login = async (email, password) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    if (response.data?.token) {
      setAuthSession(response.data);
    }
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
