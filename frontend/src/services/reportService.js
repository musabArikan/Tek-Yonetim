import * as XLSX from "xlsx";
import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { call, callSilent } from "./serviceUtils.js";

/** Günlük (Z) raporu. date: "YYYY-MM-DD", userId: opsiyonel personel filtresi. */
export const getZRaporu = (date, userId) =>
  callSilent(
    async () => {
      const { data } = await api.get("/reports/daily", {
        params: { date, userId },
      });
      return data;
    },
    () => localDb.reports.daily({ date, userId }),
  );

/** Aylık rapor. month: "YYYY-MM" (ör. "2026-10"), userId: opsiyonel personel filtresi. */
export const getMonthlyReport = (month, userId) =>
  callSilent(
    async () => {
      const { data } = await api.get("/reports/monthly", {
        params: { month, userId },
      });
      return data;
    },
    () => localDb.reports.monthly({ month, userId }),
  );

/** Borçluya SMS/WhatsApp hatırlatıcı. */
export const sendReminder = (payload) =>
  call(
    async () => {
      const { data } = await api.post("/reports/reminder", payload);
      return data;
    },
    () => localDb.reports.sendReminder(payload),
  );

/** Sistem içi rapor tablosu için satır verilerini döner. */
export const getReportTableData = (type, params = {}) =>
  call(
    async () => {
      const { data } = await api.get("/reports/export-rows", {
        params: { type, ...params },
      });
      return data;
    },
    () => localDb.reports.exportRows(type, params),
  );

/**
 * Excel veya CSV dışa aktarma.
 * type: "products" | "customers" | "debtors" | "transactions" | "actionlogs"
 * format: "xlsx" | "csv"
 */
export const exportData = async (type, params = {}, format = "xlsx") => {
  const result = await getReportTableData(type, params);
  const rows = Array.isArray(result?.rows) ? result.rows : [];
  const sheetName = result?.sheetName || "Rapor";
  const fileName = result?.fileName || `${type}.xlsx`;

  const sheet = XLSX.utils.json_to_sheet(rows);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const csvFileName = (fileName || `${type}.xlsx`).replace(/\.xlsx$/i, ".csv");
    return {
      fileName: csvFileName,
      blob: new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      }),
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

  return {
    fileName,
    blob: new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  };
};
