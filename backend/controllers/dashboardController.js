const Transaction = require("../models/Transaction");
const Collection = require("../models/Collection");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const User = require("../models/User");
const ActionLog = require("../models/ActionLog");
const { num, round2, fullName, todayBounds, inRange } = require("../utils/helpers");

const pendingQuantity = (line = {}) =>
  num(
    line.envanterdeBekleyenAdet !== undefined
      ? line.envanterdeBekleyenAdet
      : line.envanterdeMi
        ? line.adet
        : 0,
  );

// GET /api/dashboard & GET /api/dashboard/summary
const getDashboardSummary = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const dayRange = todayBounds();
    const now = new Date();
    const monthRange = [
      new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime(),
    ];

    const [liveTx, collections, customers, products, users, actionLogs] = await Promise.all([
      Transaction.find({ tenantId, isDeleted: false }).sort({ tarih: -1, createdAt: -1 }).lean(),
      Collection.find({ tenantId, isDeleted: false }).lean(),
      Customer.find({ tenantId, isDeleted: false }).lean(),
      Product.find({ tenantId, isDeleted: false }).lean(),
      User.find({ tenantId, isDeleted: false }).lean(),
      ActionLog.find({ tenantId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const sales = liveTx.filter((t) => t.islemTuru === "Satış");
    const sumTotal = (list) => round2(list.reduce((sum, t) => sum + num(t.toplamTutar, 0), 0));

    const gunlukKasa = round2(
      collections
        .filter((c) => inRange(c.collectionDate, dayRange))
        .reduce((sum, c) => sum + num(c.amount, 0), 0),
    );
    const gunlukSatis = sumTotal(sales.filter((t) => inRange(t.tarih, dayRange)));
    const aylikSatis = sumTotal(sales.filter((t) => inRange(t.tarih, monthRange)));

    const debtors = customers.filter((c) => num(c.toplamKalanBakiye, 0) > 0);
    const toplamAlacak = round2(
      debtors.reduce((sum, c) => sum + num(c.toplamKalanBakiye, 0), 0),
    );

    const criticalProducts = products.filter(
      (p) => num(p.mevcutStok, 0) <= num(p.kritikStokSeviyesi, 5),
    );

    const pendingLines = liveTx.flatMap((t) =>
      (t.urunler || []).map((line) => pendingQuantity(line)).filter((qty) => qty > 0),
    );
    const emanetteBekleyenAdet = pendingLines.reduce((sum, qty) => sum + qty, 0);

    const customerById = new Map(customers.map((c) => [String(c._id), c]));
    const userById = new Map(users.map((u) => [String(u._id), u]));

    const magazaHareketleri = liveTx.map((t) => {
      const isSale = t.islemTuru === "Satış";
      const cust = customerById.get(String(t.musteriId));
      const actorUser = userById.get(String(t.createdBy));
      const personelAdi =
        t.personelAdi || (actorUser ? fullName(actorUser) : "Mağaza Yetkilisi");
      const musteriAdSoyad = t.musteriAdSoyad || (cust ? fullName(cust) : "Müşteri");
      const urunDetay = (t.urunler || [])
        .map((l) =>
          l.urunAdi && l.urunAdi !== l.urunKodu
            ? `${l.urunKodu} — ${l.urunAdi} (x${l.adet})`
            : `${l.urunKodu} (x${l.adet})`,
        )
        .join(", ");

      return {
        id: String(t._id),
        _id: t._id,
        tarih: t.tarih || t.createdAt,
        personelId: t.createdBy ? String(t.createdBy) : "",
        personelAdi,
        musteriId: cust?._id || t.musteriId,
        musteriAdSoyad,
        musteriNo: t.musteriNo || cust?.musteriNo || "",
        islemTuru: t.islemTuru || "Satış",
        odemeYontemi: t.odemeYontemi || (isSale ? "Veresiye" : "Nakit"),
        urunler: t.urunler || [],
        detay: isSale
          ? urunDetay || t.urunBilgisi || "Ürün Satışı"
          : t.aciklama || `${t.odemeYontemi || "Nakit"} ile cari borç tahsilatı`,
        tutar: isSale
          ? num(t.toplamTutar, 0)
          : num(t.odenenTutar ?? t.tutar ?? t.toplamTutar ?? t.pesinat ?? 0),
        pesinat: num(t.pesinat, 0),
        kalanBorc: num(t.kalanHesap ?? t.kalanBorc ?? 0),
      };
    });

    const personelListesi = users.map((u) => ({
      id: String(u._id),
      _id: u._id,
      adSoyad: fullName(u),
      role: u.role,
    }));

    return res.json({
      gunlukKasa,
      toplamAcikAlacak: toplamAlacak,
      alacakliMusteriSayisi: debtors.length,
      emanetteBekleyenAdet,
      emanetteBekleyenKayitSayisi: pendingLines.length,
      kritikStokSayisi: criticalProducts.length,
      magazaHareketleri,
      personelListesi,
      sonHareketler: actionLogs,
      kasa: { gunlukSatis, aylikSatis },
      alacaklar: { toplamAlacak, alacakliMusteriSayisi: debtors.length },
      kritikStok: {
        esik: 5,
        urunSayisi: criticalProducts.length,
        urunler: criticalProducts
          .sort((a, b) => num(a.mevcutStok) - num(b.mevcutStok))
          .map((p) => ({
            urunKodu: p.urunKodu || p.ad,
            marka: p.marka || "",
            adet: num(p.mevcutStok),
          })),
      },
      bekleyenEnvanter: {
        bekleyenTeslimatSayisi: pendingLines.length,
        bekleyenToplamAdet: emanetteBekleyenAdet,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardSummary,
};
