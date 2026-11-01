const defaultPermissions = {
  musteriSilebilir: false,
  tahsilatAlabilir: false,
  satisYapabilir: false,
  stokDuzenleyebilir: false,
  envanterDuzenleyebilir: false,
  zRaporuAlabilir: false,
  excelExportEdebilir: false,
};

export const ALL_PAGE_KEYS = [
  "dashboard",
  "magazam",
  "musteriler",
  "urun-stok",
  "envanter",
  "musteri-finans",
  "raporlar",
  "personeller",
];

export const PAGE_ACCESS_OPTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "magazam", label: "Mağazam" },
  { key: "musteriler", label: "Müşteriler" },
  { key: "urun-stok", label: "Ürün & Stok" },
  { key: "envanter", label: "Emanetler" },
  { key: "musteri-finans", label: "Cari & Finans" },
  { key: "raporlar", label: "Raporlar" },
  { key: "personeller", label: "Personeller" },
];

export const DEFAULT_STAFF_ALLOWED_PAGES = {
  dashboard: true,
  magazam: false,
  musteriler: true,
  "urun-stok": true,
  envanter: true,
  "musteri-finans": true,
  raporlar: true,
  personeller: false,
};

export const ALL_PAGES_ALLOWED = Object.fromEntries(
  ALL_PAGE_KEYS.map((key) => [key, true]),
);

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

export const normalizePermissions = (permissions = {}) => ({
  ...defaultPermissions,
  ...permissions,
});

export const normalizePageLocks = (pageLocks = {}) => ({
  ...defaultPageLocks,
  ...pageLocks,
});

export const normalizeAllowedPages = (
  allowedPages,
  { role = "personel", pageLocks = null } = {},
) => {
  if (allowedPages && typeof allowedPages === "object" && !Array.isArray(allowedPages)) {
    const base = role === "admin" ? ALL_PAGES_ALLOWED : DEFAULT_STAFF_ALLOWED_PAGES;
    const result = { ...base };
    ALL_PAGE_KEYS.forEach((key) => {
      if (allowedPages[key] !== undefined) {
        result[key] = Boolean(allowedPages[key]);
      }
    });
    return result;
  }

  if (Array.isArray(allowedPages)) {
    return Object.fromEntries(
      ALL_PAGE_KEYS.map((key) => [key, allowedPages.includes(key)]),
    );
  }

  if (role === "admin") {
    return { ...ALL_PAGES_ALLOWED };
  }

  const locks = normalizePageLocks(pageLocks || {});
  return {
    dashboard: !locks.dashboard,
    // Varsayılan olarak Mağazam ve Personeller yalnızca mağaza kurucusuna (admin) açıktır
    magazam: false,
    musteriler: !locks.musteriler,
    "urun-stok": !locks["urun-stok"] && !locks.stok,
    envanter: !locks.envanter,
    "musteri-finans": !locks["musteri-finans"] && !locks.borclular,
    raporlar: !locks.raporlar,
    personeller: false,
  };
};

export const allowedPagesToPageLocks = (allowedPages = {}) => {
  const normalized = normalizeAllowedPages(allowedPages, { role: "personel" });
  return {
    dashboard: !normalized.dashboard,
    magazam: !normalized.magazam,
    musteriler: !normalized.musteriler,
    "urun-stok": !normalized["urun-stok"],
    stok: !normalized["urun-stok"],
    envanter: !normalized.envanter,
    "musteri-finans": !normalized["musteri-finans"],
    borclular: !normalized["musteri-finans"],
    raporlar: !normalized.raporlar,
    personeller: !normalized.personeller,
  };
};

export const hasPermission = (permissions, permissionKey) =>
  Boolean(normalizePermissions(permissions)[permissionKey]);

export const isPageLocked = (pageLocks, pageKey) =>
  Boolean(normalizePageLocks(pageLocks)[pageKey]);

export const getAvailablePages = (sessionOrUser) => {
  if (!sessionOrUser) return ["musteriler"];

  const allowedMap = normalizeAllowedPages(sessionOrUser.allowedPages, {
    role: sessionOrUser.role,
    pageLocks: sessionOrUser.pageLocks,
  });

  const allowedList = ALL_PAGE_KEYS.filter((key) => Boolean(allowedMap[key]));
  return allowedList.length > 0 ? allowedList : ["musteriler"];
};

export const canAccessPage = (sessionOrUser, pageId) => {
  if (!pageId) return false;
  const available = getAvailablePages(sessionOrUser);
  return available.includes(pageId);
};

export const getDefaultPageForUser = (sessionOrUser) => {
  const available = getAvailablePages(sessionOrUser);
  if (available.includes("dashboard")) return "dashboard";
  if (available.includes("musteriler")) return "musteriler";
  return available[0] || "musteriler";
};
