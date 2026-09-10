const defaultPermissions = {
  musteriSilebilir: false,
  tahsilatAlabilir: false,
  satisYapabilir: false,
  stokDuzenleyebilir: false,
  envanterDuzenleyebilir: false,
  zRaporuAlabilir: false,
  excelExportEdebilir: false,
};

const defaultPageLocks = {
  stok: false,
  envanter: false,
  borclular: false,
  personeller: false,
  raporlar: false,
};

export const normalizePermissions = (permissions = {}) => ({
  ...defaultPermissions,
  ...permissions,
});

export const normalizePageLocks = (pageLocks = {}) => ({
  ...defaultPageLocks,
  ...pageLocks,
});

export const hasPermission = (permissions, permissionKey) =>
  Boolean(normalizePermissions(permissions)[permissionKey]);

export const isPageLocked = (pageLocks, pageKey) =>
  Boolean(normalizePageLocks(pageLocks)[pageKey]);
