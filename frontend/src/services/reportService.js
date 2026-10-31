import * as XLSX from "xlsx";
import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

/** Günlük (Z) raporu. date: "YYYY-MM-DD", userId: opsiyonel personel filtresi. */
export const getZRaporu = (date, userId) =>
  localDb.reports.daily({ date, userId });

/** Aylık rapor. month: "YYYY-MM" (ör. "2026-10"), userId: opsiyonel personel filtresi. */
export const getMonthlyReport = (month, userId) =>
  localDb.reports.monthly({ month, userId });

/** Borçluya SMS/WhatsApp hatırlatıcı (lokal modda yalnızca kayıt altına alınır). */
export const sendReminder = (payload) =>
  call(() => localDb.reports.sendReminder(payload));

/** Sistem içi rapor tablosu için satır verilerini döner. */
export const getReportTableData = (type, params = {}) =>
  call(() => localDb.reports.exportRows(type, params));

/**
 * Excel veya CSV dışa aktarma.
 * type: "products" | "customers" | "debtors" | "transactions" | "actionlogs"
 * format: "xlsx" | "csv"
 */
export const exportData = async (type, params = {}, format = "xlsx") => {
  const { rows, sheetName, fileName } = await localDb.reports.exportRows(type, params);

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
