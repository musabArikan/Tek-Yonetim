import { createHttpError } from "./localDb.js";

/**
 * Lokal Veri Motoru (Mock DB) modunda tüm servisler doğrudan `localDb` üzerinden çalışır.
 * Bu dosya yalnızca eski import'ların kırılmaması ve yanlışlıkla ağ isteği atılmaması için korunmaktadır.
 */
const blocked = (method) => (url) =>
  Promise.reject(
    createHttpError(
      `Lokal veri motoru aktif: ağ isteği engellendi (${method.toUpperCase()} ${url || ""}).`,
      500,
    ),
  );

const api = {
  get: blocked("get"),
  post: blocked("post"),
  put: blocked("put"),
  patch: blocked("patch"),
  delete: blocked("delete"),
};

export default api;
