import { handleApiError } from "../utils/apiError.js";

const isNetworkOfflineError = (error) =>
  !error?.response &&
  (error?.code === "ERR_NETWORK" ||
    error?.code === "ECONNABORTED" ||
    String(error?.message || "").includes("Network Error"));

/**
 * Gerçek Backend API çağrısını çalıştırır; hata durumunda standart toast + rethrow uygular.
 * Yalnızca sunucuya fiziksel olarak ulaşılamayan çevrimdışı (ERR_NETWORK) durumlarda
 * opsiyonel `fallbackFn` varsa onu çalıştırır; HTTP 4xx/5xx hatalarında asla fallback yapmaz.
 */
export const call = async (fn, fallbackFn = null) => {
  try {
    return await fn();
  } catch (error) {
    if (fallbackFn && isNetworkOfflineError(error)) {
      try {
        return await fallbackFn();
      } catch (fallbackError) {
        handleApiError(fallbackError);
      }
    }
    handleApiError(error);
  }
};

export const callSilent = async (fn, fallbackFn = null) => {
  try {
    return await fn();
  } catch (error) {
    if (fallbackFn && isNetworkOfflineError(error)) {
      return await fallbackFn();
    }
    throw error;
  }
};
