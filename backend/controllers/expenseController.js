const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Stock = require("../models/Stock");
const { EXPENSE_CATEGORIES } = require("../utils/constants");
const {
  str,
  num,
  round2,
  fullName,
  isObjectId,
  dayBounds,
  normalizeDate,
} = require("../utils/helpers");
const { logAction } = require("../utils/auditLogger");

const resolveMonthRange = ({ year, month, startDate, endDate } = {}) => {
  if (startDate && endDate) {
    return {
      range: [dayBounds(startDate)[0], dayBounds(endDate)[1]],
      isCurrentMonth: false,
      year: new Date(startDate).getFullYear(),
      month: new Date(startDate).getMonth() + 1,
    };
  }

  const now = new Date();
  const targetYear = Number(year) || now.getFullYear();
  const targetMonth = Number(month) || now.getMonth() + 1;
  const isCurrentMonth =
    targetYear === now.getFullYear() && targetMonth === now.getMonth() + 1;

  const startMs = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0).getTime();
  const endMs = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
    : new Date(targetYear, targetMonth, 0, 23, 59, 59, 999).getTime();

  return {
    range: [startMs, endMs],
    isCurrentMonth,
    year: targetYear,
    month: targetMonth,
  };
};

// GET /api/expenses
const getExpenses = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const query = { tenantId, isDeleted: false };

    if (req.query?.category) {
      query.category = req.query.category;
    }

    const hasPeriodFilter = Boolean(
      req.query?.year || req.query?.month || req.query?.startDate || req.query?.endDate,
    );
    if (hasPeriodFilter) {
      const { range } = resolveMonthRange(req.query);
      query.date = {
        $gte: new Date(range[0]),
        $lte: new Date(range[1]),
      };
    }

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
    return res.json(expenses);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/expenses
const createExpense = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const amount = round2(num(req.body?.amount, 0));
    if (!(amount > 0)) {
      return res.status(400).json({ message: "Gider tutarı 0'dan büyük olmalıdır." });
    }

    const category = str(req.body?.category) || "Diğer";
    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Geçersiz gider kategorisi." });
    }

    const date = normalizeDate(req.body?.date);
    const description = str(req.body?.description);

    const expense = await Expense.create({
      tenantId,
      storeId: tenantId,
      amount,
      date,
      category,
      description,
      createdBy: req.user.userId,
      createdByName: fullName(req.user),
      createdAt: date,
      updatedAt: date,
    });

    logAction(req.user, "GIDER_EKLE", "Expense", expense._id, {
      category,
      amount,
      description,
    });

    return res.status(201).json(expense);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz gider kimliği." });
    }
    const tenantId = req.user.tenantId;
    const expense = await Expense.findOne({
      _id: req.params.id,
      tenantId,
      isDeleted: false,
    });
    if (!expense) {
      return res.status(404).json({ message: "Gider kaydı bulunamadı." });
    }

    if (req.body?.amount !== undefined) {
      const nextAmount = round2(num(req.body.amount, 0));
      if (!(nextAmount > 0)) {
        return res.status(400).json({ message: "Gider tutarı 0'dan büyük olmalıdır." });
      }
      expense.amount = nextAmount;
    }

    if (req.body?.category !== undefined) {
      const nextCategory = str(req.body.category);
      if (!EXPENSE_CATEGORIES.includes(nextCategory)) {
        return res.status(400).json({ message: "Geçersiz gider kategorisi." });
      }
      expense.category = nextCategory;
    }

    if (req.body?.date !== undefined) {
      expense.date = normalizeDate(req.body.date);
    }

    if (req.body?.description !== undefined) {
      expense.description = str(req.body.description);
    }

    await expense.save();
    return res.json(expense);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz gider kimliği." });
    }
    const tenantId = req.user.tenantId;
    const expense = await Expense.findOne({
      _id: req.params.id,
      tenantId,
      isDeleted: false,
    });
    if (!expense) {
      return res.status(404).json({ message: "Gider kaydı bulunamadı." });
    }

    expense.isDeleted = true;
    expense.deletedBy = req.user.userId;
    await expense.save();

    logAction(req.user, "GIDER_SIL", "Expense", expense._id, {
      category: expense.category,
      amount: expense.amount,
    });

    return res.json({ message: "Gider kaydı silindi" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/expenses/monthly-summary
const getMonthlySummary = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { range, isCurrentMonth, year, month } = resolveMonthRange(req.query);
    const startDate = new Date(range[0]);
    const endDate = new Date(range[1]);

    const [sales, periodExpenses, products, stocks] = await Promise.all([
      Transaction.find({
        tenantId,
        isDeleted: false,
        islemTuru: "Satış",
        tarih: { $gte: startDate, $lte: endDate },
      }).sort({ tarih: -1, createdAt: -1 }),
      Expense.find({
        tenantId,
        isDeleted: false,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: -1, createdAt: -1 }),
      Product.find({ tenantId, isDeleted: false }).select("urunKodu alisFiyati").lean(),
      Stock.find({ tenantId }).select("urunKodu alisFiyati").lean(),
    ]);

    const productCostByCode = new Map(products.map((p) => [p.urunKodu, num(p.alisFiyati, 0)]));
    const stockCostByCode = new Map(stocks.map((s) => [s.urunKodu, num(s.alisFiyati, 0)]));

    const customerIds = [
      ...new Set(
        sales
          .map((t) => (t.musteriId ? String(t.musteriId) : ""))
          .filter((id) => isObjectId(id)),
      ),
    ];
    const customers = customerIds.length
      ? await Customer.find({ tenantId, _id: { $in: customerIds } }).lean()
      : [];
    const customerMap = new Map(customers.map((c) => [String(c._id), c]));

    const calculateTxCost = (tx) => {
      if (!Array.isArray(tx.urunler) || tx.urunler.length === 0) {
        return round2(num(tx.toplamMaliyet, 0));
      }
      return round2(
        tx.urunler.reduce((sum, line) => {
          const qty = Math.max(0, num(line.adet, 0));
          if (line.alisFiyati !== undefined && line.alisFiyati !== null) {
            return sum + num(line.alisFiyati, 0) * qty;
          }
          const fallbackCost =
            productCostByCode.get(line.urunKodu) ??
            stockCostByCode.get(line.urunKodu) ??
            0;
          return sum + num(fallbackCost, 0) * qty;
        }, 0),
      );
    };

    const aylikToplamCiro = round2(sales.reduce((sum, t) => sum + num(t.toplamTutar, 0), 0));
    const satilanUrunMaliyeti = round2(sales.reduce((sum, t) => sum + calculateTxCost(t), 0));
    const brutSatisKazanci = round2(aylikToplamCiro - satilanUrunMaliyeti);
    const dukkanGiderleri = round2(
      periodExpenses.reduce((sum, e) => sum + num(e.amount, 0), 0),
    );
    const netKazanc = round2(brutSatisKazanci - dukkanGiderleri);
    const satilanUrunAdedi = sales.reduce(
      (sum, t) =>
        sum + (t.urunler || []).reduce((inner, line) => inner + Math.max(0, num(line.adet, 0)), 0),
      0,
    );

    const periodSales = sales.map((t) => {
      const cust = customerMap.get(String(t.musteriId));
      const satisTutari = round2(num(t.toplamTutar, 0));
      const alisMaliyeti = calculateTxCost(t);
      const netSatisKari = round2(satisTutari - alisMaliyeti);
      const urunAciklama = (t.urunler || [])
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
        musteriId: cust?._id || t.musteriId,
        musteriAdSoyad: t.musteriAdSoyad || (cust ? fullName(cust) : "Müşteri"),
        musteriNo: t.musteriNo || cust?.musteriNo || "",
        urunler: t.urunler || [],
        urunBilgisi: urunAciklama || t.urunBilgisi || "Ürün Satışı",
        odemeYontemi: t.odemeYontemi || "Veresiye",
        satisTutari,
        alisMaliyeti,
        netSatisKari,
      };
    });

    return res.json({
      year,
      month,
      isCurrentMonth,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      aylikToplamCiro,
      satilanUrunMaliyeti,
      brutSatisKazanci,
      dukkanGiderleri,
      netKazanc,
      satisSayisi: sales.length,
      satilanUrunAdedi,
      giderSayisi: periodExpenses.length,
      sales: periodSales,
      expenses: periodExpenses,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getMonthlySummary,
};

