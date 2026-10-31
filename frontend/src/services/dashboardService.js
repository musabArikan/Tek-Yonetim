import { localDb } from "../utils/localDb.js";

export const getDashboardSummary = () => localDb.dashboard.summary();
