/**
 * Sayfa bazlı yetkilendirme (frontend/src/utils/rbac.js ile aynı kurallar).
 */
const { PAGE_KEYS, PERMISSION_KEYS } = require("./constants");

const ALL_PAGES_ALLOWED = Object.fromEntries(PAGE_KEYS.map((key) => [key, true]));

// Yeni personel: "Mağazam" ve "Personeller" varsayılan olarak kapalıdır.
const DEFAULT_STAFF_ALLOWED_PAGES = {
  dashboard: true,
  magazam: false,
  musteriler: true,
  "urun-stok": true,
  envanter: true,
  "musteri-finans": true,
  raporlar: true,
  personeller: false,
};

const defaultPageLocks = {
  dashboard: false,
  magazam: false,
  musteriler: false,
  "urun-stok": false,
  stok: false,
  envanter: false,
  "musteri-finans": false,
  borclular: false,
  raporlar: false,
  personeller: false,
};

const normalizePageLocks = (pageLocks = {}) => ({ ...defaultPageLocks, ...(pageLocks || {}) });

const normalizeAllowedPages = (
  allowedPages,
  optionsOrPageLocks = {},
  maybeRole = "personel",
  maybeIsStoreOwner = false,
) => {
  const isOptionsObj =
    optionsOrPageLocks &&
    typeof optionsOrPageLocks === "object" &&
    ("role" in optionsOrPageLocks ||
      "pageLocks" in optionsOrPageLocks ||
      "isStoreOwner" in optionsOrPageLocks);

  const role = isOptionsObj ? optionsOrPageLocks.role || "personel" : maybeRole || "personel";
  const isStoreOwner = isOptionsObj
    ? Boolean(optionsOrPageLocks.isStoreOwner)
    : Boolean(maybeIsStoreOwner);
  const pageLocks = isOptionsObj ? optionsOrPageLocks.pageLocks : optionsOrPageLocks;

  if (isStoreOwner || role === "admin") {
    if (allowedPages && typeof allowedPages === "object" && !Array.isArray(allowedPages)) {
      const result = { ...ALL_PAGES_ALLOWED };
      PAGE_KEYS.forEach((key) => {
        if (allowedPages[key] !== undefined) result[key] = Boolean(allowedPages[key]);
      });
      if (isStoreOwner) return { ...ALL_PAGES_ALLOWED };
      return result;
    }
    return { ...ALL_PAGES_ALLOWED };
  }

  if (allowedPages && typeof allowedPages === "object" && !Array.isArray(allowedPages)) {
    const result = { ...DEFAULT_STAFF_ALLOWED_PAGES };
    PAGE_KEYS.forEach((key) => {
      if (allowedPages[key] !== undefined) result[key] = Boolean(allowedPages[key]);
    });
    return result;
  }

  if (Array.isArray(allowedPages)) {
    return Object.fromEntries(PAGE_KEYS.map((key) => [key, allowedPages.includes(key)]));
  }

  const locks = normalizePageLocks(pageLocks || {});
  return {
    dashboard: !locks.dashboard,
    magazam: false,
    musteriler: !locks.musteriler,
    "urun-stok": !locks["urun-stok"] && !locks.stok,
    envanter: !locks.envanter,
    "musteri-finans": !locks["musteri-finans"] && !locks.borclular,
    raporlar: !locks.raporlar,
    personeller: false,
  };
};

const allowedPagesToPageLocks = (allowedPages = {}) => {
  const n = normalizeAllowedPages(allowedPages, { role: "personel" });
  return {
    dashboard: !n.dashboard,
    magazam: !n.magazam,
    musteriler: !n.musteriler,
    "urun-stok": !n["urun-stok"],
    stok: !n["urun-stok"],
    envanter: !n.envanter,
    "musteri-finans": !n["musteri-finans"],
    borclular: !n["musteri-finans"],
    raporlar: !n.raporlar,
    personeller: !n.personeller,
  };
};

const normalizeFlags = (value, keysOrDefaults = PERMISSION_KEYS) => {
  const isKeyArray = Array.isArray(keysOrDefaults);
  const keys = isKeyArray
    ? keysOrDefaults
    : keysOrDefaults && typeof keysOrDefaults === "object"
      ? Object.keys(keysOrDefaults)
      : PERMISSION_KEYS;
  const flags = Object.fromEntries(
    keys.map((key) => [
      key,
      !isKeyArray && keysOrDefaults && typeof keysOrDefaults === "object"
        ? Boolean(keysOrDefaults[key])
        : false,
    ]),
  );
  if (!value) return flags;
  if (Array.isArray(value)) {
    value.forEach((key) => {
      if (keys.includes(key)) flags[key] = true;
    });
    return flags;
  }
  keys.forEach((key) => {
    if (value[key] !== undefined) {
      flags[key] = Boolean(value[key]);
    }
  });
  return flags;
};

const allPermissions = (enabled = true) =>
  Object.fromEntries(PERMISSION_KEYS.map((key) => [key, Boolean(enabled)]));

module.exports = {
  ALL_PAGES_ALLOWED,
  DEFAULT_STAFF_ALLOWED_PAGES,
  normalizeAllowedPages,
  allowedPagesToPageLocks,
  normalizePageLocks,
  normalizeFlags,
  allPermissions,
};

