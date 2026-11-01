import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { callSilent } from "./serviceUtils.js";

export const getDashboardSummary = () =>
  callSilent(
    async () => {
      const { data } = await api.get("/dashboard/summary");
      return data;
    },
    () => localDb.dashboard.summary(),
  );
