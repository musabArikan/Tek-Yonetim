import api from "../utils/api";
import { handleApiError } from "../utils/apiError";

/**
 * GET /api/dashboard/summary
 * Tenant'a özgü özet dashboard verilerini getirir.
 * @returns {{ kasa, alacaklar, kritikStok, bekleyenEnvanter }}
 */
export const getDashboardSummary = async () => {
  try {
    const response = await api.get("/dashboard/summary");
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
