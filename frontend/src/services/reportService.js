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

/**
 * Excel dışa aktarma. type: "products" | "customers" | "debtors" | "transactions" | "actionlogs"
 * Dönen değer indirilebilir bir Blob'dur (eski `/export/:type` blob yanıtıyla aynı).
 */
export const exportData = async (type) => {
  const { rows, sheetName, fileName } = await localDb.reports.exportRows(type);

  const sheet = XLSX.utils.json_to_sheet(rows);
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
