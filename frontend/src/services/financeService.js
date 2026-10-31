import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

// Tahsilat (kasa) fonksiyonları artık collectionService.js içinde; geriye dönük uyumluluk için
// buradan da dışa aktarılır (CustomerFinancePage bu dosyadan import eder).
export {
  getCollections,
  getCollectionById,
  createCollection,
  deleteCollection,
} from "./collectionService.js";

// ─── Installment (Taksit/Senet) ──────────────────────────────────────────────
// Yeni mimaride vade/taksit kullanılmayacak; eski arayüzler `undefined` hatası
// vermesin diye fonksiyonlar korunur (seed verisinde taksit yoktur).

export const getInstallments = (params = {}) =>
  call(() => localDb.installments.list(params));

export const getOverdueInstallments = () =>
  call(() => localDb.installments.listOverdue());

export const getCustomerInstallmentSummary = (customerId) =>
  call(() => localDb.installments.customerSummary(customerId));

export const getInstallmentById = (installmentId) =>
  call(() => localDb.installments.getById(installmentId));

export const createInstallment = (installmentData) =>
  call(() => localDb.installments.create(installmentData));

export const markInstallmentPaid = (installmentId, paidDate) =>
  call(() => localDb.installments.markPaid(installmentId, paidDate));

export const deleteInstallment = (installmentId) =>
  call(() => localDb.installments.remove(installmentId));
