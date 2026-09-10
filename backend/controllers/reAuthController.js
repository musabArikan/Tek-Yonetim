const bcrypt = require("bcrypt");
const User = require("../models/User");

/**
 * POST /api/auth/re-auth
 * Body: { page: "finans" | "stok" | ..., password: "..." }
 * Kullanıcının pagePasswords[page] hash'iyle girilen şifreyi karşılaştırır.
 * Eşleşirse { authorized: true } döner.
 */
const reAuth = async (req, res) => {
  try {
    const { page, password } = req.body;

    if (!page || !password) {
      return res.status(400).json({ message: "Sayfa adı ve şifre zorunludur" });
    }

    const user = await User.findOne({
      _id: req.user.userId,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const storedHash = user.pagePasswords?.[page];
    if (!storedHash) {
      // Bu sayfa için şifre tanımlanmamış — serbest erişim
      return res.status(200).json({ authorized: true, noPassword: true });
    }

    const isMatch = await bcrypt.compare(password, storedHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Şifre hatalı" });
    }

    return res.status(200).json({ authorized: true });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
};

/**
 * PATCH /api/users/:id/page-password
 * Body: { page: "finans", password: "abc123" } — "" ise kilit kaldırılır
 * Sadece admin/yönetici çağırabilir.
 */
const setPagePassword = async (req, res) => {
  try {
    const { page, password } = req.body;
    const validPages = ["finans", "stok", "raporlar", "envanter", "transferler"];

    if (!page || !validPages.includes(page)) {
      return res.status(400).json({ message: "Geçersiz sayfa adı" });
    }

    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    if (!password) {
      // Şifreyi kaldır
      user.pagePasswords[page] = "";
    } else {
      const salt = await bcrypt.genSalt(10);
      user.pagePasswords[page] = await bcrypt.hash(password, salt);
    }

    user.markModified("pagePasswords");
    await user.save();

    res.status(200).json({ message: "Sayfa şifresi güncellendi" });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
};

module.exports = { reAuth, setPagePassword };
