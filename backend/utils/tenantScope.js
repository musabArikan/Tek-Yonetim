const getTenantId = (req) => req.user.tenantId;
const getUserId = (req) => req.user.userId;

const withTenant = (req, extra = {}) => ({
  tenantId: getTenantId(req),
  ...extra,
});

const activeCustomers = (req, extra = {}) =>
  withTenant(req, { isDeleted: false, ...extra });

const activeTransactions = (req, extra = {}) =>
  withTenant(req, { isDeleted: false, ...extra });

module.exports = {
  getTenantId,
  getUserId,
  withTenant,
  activeCustomers,
  activeTransactions,
};
