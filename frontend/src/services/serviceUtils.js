import { handleApiError } from "../utils/apiError.js";

/**
 * Lokal veri motoru çağrısını eski axios servislerindeki hata davranışıyla sarar:
 * hata olursa toast gösterir ve hatayı tekrar fırlatır (sayfalar `error.response.data.message` okur).
 */
export const call = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    handleApiError(error);
  }
};
