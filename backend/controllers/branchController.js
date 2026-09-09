const Branch = require("../models/Branch");
const { getTenantId, getUserId, withTenant } = require("../utils/tenantScope");

const activeBranches = (req, extra = {}) =>
  withTenant(req, { isActive: true, ...extra });

// POST /api/branches
const createBranch = async (req, res) => {
  try {
    const { ad, adres, telefon, sorumluPersonel } = req.body;

    if (!ad || !ad.trim()) {
      return res.status(400).json({ message: "Şube adı zorunludur" });
    }

    const existing = await Branch.findOne(
      withTenant(req, { ad: ad.trim() }),
    );
    if (existing) {
      return res
        .status(400)
        .json({ message: "Bu isimde bir şube zaten mevcut" });
    }

    const branch = await Branch.create({
      tenantId: getTenantId(req),
      createdBy: getUserId(req),
      ad: ad.trim(),
      adres: adres?.trim(),
      telefon: telefon?.trim(),
      sorumluPersonel: sorumluPersonel || undefined,
    });

    res.status(201).json(branch);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }
    res.status(500).json({ message: "Şube oluşturulurken hata oluştu", error: error.message });
  }
};

// GET /api/branches
const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find(activeBranches(req))
      .populate("sorumluPersonel", "ad soyad")
      .sort({ ad: 1 });
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ message: "Şubeler alınırken hata oluştu", error: error.message });
  }
};

// GET /api/branches/:id
const getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findOne(
      activeBranches(req, { _id: req.params.id }),
    ).populate("sorumluPersonel", "ad soyad");

    if (!branch) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }

    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({ message: "Şube alınırken hata oluştu", error: error.message });
  }
};

// PUT /api/branches/:id
const updateBranch = async (req, res) => {
  try {
    const { ad, adres, telefon, sorumluPersonel } = req.body;

    const branch = await Branch.findOne(
      activeBranches(req, { _id: req.params.id }),
    );
    if (!branch) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }

    if (ad) branch.ad = ad.trim();
    if (adres !== undefined) branch.adres = adres?.trim();
    if (telefon !== undefined) branch.telefon = telefon?.trim();
    if (sorumluPersonel !== undefined)
      branch.sorumluPersonel = sorumluPersonel || undefined;

    await branch.save();
    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({ message: "Şube güncellenirken hata oluştu", error: error.message });
  }
};

// DELETE /api/branches/:id (soft delete)
const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne(
      activeBranches(req, { _id: req.params.id }),
    );
    if (!branch) {
      return res.status(404).json({ message: "Şube bulunamadı" });
    }

    branch.isActive = false;
    await branch.save();

    res.status(200).json({ message: "Şube başarıyla silindi" });
  } catch (error) {
    res.status(500).json({ message: "Şube silinirken hata oluştu", error: error.message });
  }
};

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
};
