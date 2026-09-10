const ActionLog = require("../models/ActionLog");

/**
 * Bir işlemi audit log'a kaydeder.
 * Fire-and-forget: hata durumunda ana akışı engellemez.
 *
 * @param {Object} req - Express request (req.user zorunlu)
 * @param {string} action - ActionLog.action enum değeri
 * @param {string} entityType - "Customer" | "Transaction" | "Collection" | "Product" | "Stock" | ...
 * @param {string|ObjectId} [entityId] - İşlem yapılan kaydın ID'si
 * @param {Object} [details] - Ek bilgiler (tutar, ürün adı vb.)
 */
const logAction = async (req, action, entityType = "Other", entityId = null, details = {}) => {
  try {
    if (!req?.user?.tenantId) return;

    await ActionLog.create({
      tenantId: req.user.tenantId,
      userId: req.user.userId || null,
      userName: `${req.user.ad || ""} ${req.user.soyad || ""}`.trim() || "Bilinmiyor",
      action,
      entityType,
      entityId: entityId || undefined,
      details,
    });
  } catch (err) {
    // Audit log hatası ana işlemi durdurmamalı
    console.error("[AuditLog] Hata:", err.message);
  }
};

module.exports = { logAction };
