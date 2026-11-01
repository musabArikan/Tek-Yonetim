const ActionLog = require("../models/ActionLog");
const { fullName } = require("./helpers");

/**
 * Denetim kaydı (fire-and-forget): hata durumunda ana akışı engellemez.
 * @param {object} actor  req.user
 */
const logAction = async (actor, action, entityType = "Other", entityId = null, details = {}, at) => {
  try {
    if (!actor?.tenantId) return;
    await ActionLog.create({
      tenantId: actor.tenantId,
      userId: actor.userId || null,
      userName: fullName(actor) || "Bilinmiyor",
      action,
      entityType,
      entityId,
      details,
      ...(at ? { createdAt: at, updatedAt: at } : {}),
    });
  } catch (error) {
    console.warn("[audit] log yazılamadı:", error.message);
  }
};

module.exports = { logAction };
