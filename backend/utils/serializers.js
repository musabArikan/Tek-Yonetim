const jwt = require("jsonwebtoken");
const { PAGE_PASSWORD_KEYS } = require("./constants");
const { normalizeAllowedPages, allowedPagesToPageLocks } = require("./rbac");
const { fullName } = require("./helpers");

const TOKEN_EXPIRES_IN = "30d";

const pagePasswordFlags = (user) =>
  Object.fromEntries(PAGE_PASSWORD_KEYS.map((key) => [key, Boolean(user.pagePasswords?.[key])]));

const resolveAllowedPages = (user) =>
  normalizeAllowedPages(user.allowedPages, { role: user.role, pageLocks: user.pageLocks });

/** Personel kaydını istemciye güvenli şekilde döndürür (şifre/hash asla gönderilmez). */
const sanitizeUser = (userDoc) => {
  const raw = userDoc.toJSON ? userDoc.toJSON() : { ...userDoc };
  const allowedPages = resolveAllowedPages(raw);
  const { password, pagePasswords, ...rest } = raw; // eslint-disable-line no-unused-vars
  return {
    ...rest,
    adSoyad: fullName(raw),
    allowedPages,
    pageLocks: allowedPagesToPageLocks(allowedPages),
    hasPagePasswords: pagePasswordFlags(raw),
  };
};

const signToken = (user) =>
  jwt.sign(
    { userId: String(user._id), tenantId: String(user.tenantId), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN },
  );

/** Frontend'in `authSession` olarak sakladığı oturum nesnesi. */
const buildSession = (user, tenant, { withToken = true } = {}) => {
  const allowedPages = resolveAllowedPages(user);
  const founderEmail = (tenant?.email || user.email || "").toLowerCase();
  const domain =
    tenant?.emailDomain || (founderEmail.includes("@") ? founderEmail.split("@")[1] : "");
  const permissions = user.permissions?.toObject ? user.permissions.toObject() : user.permissions;

  return {
    ...(withToken ? { token: signToken(user) } : {}),
    userId: String(user._id),
    ad: user.ad,
    soyad: user.soyad,
    tenantId: String(user.tenantId),
    storeName: tenant?.name || "Mağaza",
    storeOwner: tenant?.ownerName || fullName(user),
    storeEmail: founderEmail,
    storeDomain: domain,
    email: user.email,
    role: user.role,
    isStoreOwner: Boolean(user.isStoreOwner),
    permissions: permissions || {},
    allowedPages,
    pageLocks: allowedPagesToPageLocks(allowedPages),
    hasPagePasswords: pagePasswordFlags(user),
  };
};

/** Mağaza (Tenant) kaydını frontend'in beklediği alan adlarıyla döndürür. */
const storeProfile = (tenant) => {
  const t = tenant.toJSON ? tenant.toJSON() : tenant;
  const founderEmail = (t.email || "").toLowerCase();
  const domain = t.emailDomain || (founderEmail.includes("@") ? founderEmail.split("@")[1] : "");
  return {
    _id: t._id,
    id: String(t._id),
    name: t.name,
    ad: t.name,
    unvan: t.name,
    ownerName: t.ownerName,
    yetkili: t.ownerName,
    phone: t.phone,
    telefon: t.phone,
    address: t.address,
    adres: t.address,
    email: founderEmail,
    kurucuEmail: founderEmail,
    emailDomain: domain,
    mailDomain: domain,
    vergiDairesi: t.vergiDairesi || "",
    vergiNo: t.vergiNo || "",
    isActive: t.isActive,
    customBrands: t.customBrands || [],
    customCategories: t.customCategories || [],
    customPaymentMethods: t.customPaymentMethods || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
};

const customerRef = (c) =>
  c
    ? {
        _id: c._id,
        id: String(c._id),
        ad: c.ad,
        soyad: c.soyad,
        telefon: c.telefon,
        adres: c.adres,
        musteriNo: c.musteriNo,
      }
    : null;

const userRef = (u) =>
  u ? { _id: u._id, id: String(u._id), ad: u.ad, soyad: u.soyad } : null;

module.exports = {
  signToken,
  buildSession,
  sanitizeUser,
  storeProfile,
  customerRef,
  userRef,
  pagePasswordFlags,
  resolveAllowedPages,
};

