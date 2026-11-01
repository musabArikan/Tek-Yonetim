const Tenant = require("../models/Tenant");
const User = require("../models/User");
const { DEFAULT_PAYMENT_METHODS } = require("../utils/constants");
const { str, lc, uniqueStringsTr } = require("../utils/helpers");
const { buildSession, storeProfile } = require("../utils/serializers");
const { logAction } = require("../utils/auditLogger");

const splitOwnerName = (ownerName = "") => {
  const parts = str(ownerName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ad: "Mağaza", soyad: "Yetkilisi" };
  if (parts.length === 1) return { ad: parts[0], soyad: "Yetkili" };
  return { ad: parts[0], soyad: parts.slice(1).join(" ") };
};

// GET /api/store/profile
const getProfile = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Mağaza bulunamadı." });
    }
    return res.json(storeProfile(tenant));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/store/profile
const updateProfile = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Mağaza bulunamadı." });
    }

    const nextName = str(
      req.body?.ad ?? req.body?.name ?? req.body?.storeName ?? req.body?.magazaAdi ?? tenant.name,
    );
    const nextOwnerName = str(
      req.body?.yetkili ??
        req.body?.ownerName ??
        req.body?.storeOwner ??
        req.body?.yetkiliAdSoyad ??
        tenant.ownerName,
    );
    const nextPhone = str(req.body?.telefon ?? req.body?.phone ?? tenant.phone);
    const nextAddress = str(req.body?.adres ?? req.body?.address ?? tenant.address);

    if (!nextName) {
      return res.status(400).json({ message: "Mağaza adı zorunludur." });
    }

    // Kurucu e-postası (email) ve personel domaini (emailDomain) KİLİTLİDİR; asla değiştirilmez.
    tenant.name = nextName;
    tenant.ownerName = nextOwnerName || tenant.ownerName;
    tenant.phone = nextPhone;
    tenant.address = nextAddress;
    await tenant.save();

    const user = await User.findOne({
      _id: req.user.userId,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });

    if (user && user.isStoreOwner && nextOwnerName) {
      const { ad, soyad } = splitOwnerName(nextOwnerName);
      user.ad = ad;
      user.soyad = soyad;
      await user.save();
    }

    logAction(req.user, "MAGAZA_PROFIL_GUNCELLE", "Tenant", tenant._id, {
      name: tenant.name,
      ownerName: tenant.ownerName,
      phone: tenant.phone,
    });

    return res.json({
      store: storeProfile(tenant),
      session: user ? buildSession(user, tenant) : null,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/store/payment-methods
const getPaymentMethods = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId).select("customPaymentMethods");
    const methods = uniqueStringsTr([
      ...DEFAULT_PAYMENT_METHODS,
      ...(Array.isArray(tenant?.customPaymentMethods) ? tenant.customPaymentMethods : []),
    ]);
    return res.json(methods);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/store/payment-methods
const addPaymentMethod = async (req, res) => {
  try {
    const cleaned = str(req.body?.name ?? req.body?.method ?? req.body?.odemeYontemi);
    if (!cleaned) {
      return res.status(400).json({ message: "Ödeme yöntemi adı zorunludur." });
    }

    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Mağaza bulunamadı." });
    }

    const current = uniqueStringsTr([
      ...DEFAULT_PAYMENT_METHODS,
      ...(Array.isArray(tenant.customPaymentMethods) ? tenant.customPaymentMethods : []),
    ]);
    const existing = current.find((item) => lc(item) === lc(cleaned));
    if (existing) {
      return res.json({ added: existing, methods: current });
    }

    tenant.customPaymentMethods = uniqueStringsTr([
      ...(Array.isArray(tenant.customPaymentMethods) ? tenant.customPaymentMethods : []),
      cleaned,
    ]);
    await tenant.save();

    const methods = uniqueStringsTr([...DEFAULT_PAYMENT_METHODS, ...tenant.customPaymentMethods]);
    logAction(req.user, "ODEME_YONTEMI_EKLE", "Tenant", tenant._id, { method: cleaned });
    return res.status(201).json({ added: cleaned, methods });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getPaymentMethods,
  addPaymentMethod,
};
