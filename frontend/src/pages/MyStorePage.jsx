import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Store,
  TrendingUp,
  ShoppingBag,
  Wallet,
  Receipt,
  Award,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  Settings,
  Save,
  X,
  Phone,
  MapPin,
  UserCheck,
  Building2,
  Filter,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  getMonthlyStoreSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  getStoreProfile,
  updateStoreProfile,
} from "../services/expenseService";
import { formatCurrency } from "../utils/money";

const MONTH_NAMES = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const CATEGORY_BADGE_STYLES = {
  Maaş: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Kira: "bg-amber-100 text-amber-800 border-amber-200",
  Fatura: "bg-sky-100 text-sky-800 border-sky-200",
  "Malzeme/Hırdavat": "bg-purple-100 text-purple-800 border-purple-200",
  Diğer: "bg-slate-100 text-slate-700 border-slate-200",
};

const pad2 = (n) => String(n).padStart(2, "0");

const toInputDate = (isoOrDate) => {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

function ExpenseFormModal({ isOpen, onClose, initialData, defaultYear, defaultMonth, onSaved }) {
  const isEdit = Boolean(initialData);
  const getDefaultDate = useCallback(() => {
    const now = new Date();
    if (defaultYear === now.getFullYear() && defaultMonth === now.getMonth() + 1) {
      return toInputDate(now);
    }
    return `${defaultYear}-${pad2(defaultMonth)}-01`;
  }, [defaultYear, defaultMonth]);

  const [form, setForm] = useState({
    amount: "",
    date: getDefaultDate(),
    category: EXPENSE_CATEGORIES[0],
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        amount: initialData.amount ?? "",
        date: toInputDate(initialData.date || initialData.createdAt),
        category: initialData.category || EXPENSE_CATEGORIES[0],
        description: initialData.description || "",
      });
    } else {
      setForm({
        amount: "",
        date: getDefaultDate(),
        category: EXPENSE_CATEGORIES[0],
        description: "",
      });
    }
  }, [initialData, isOpen, getDefaultDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = Number(form.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Lütfen 0'dan büyük geçerli bir gider tutarı giriniz.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: numericAmount,
        date: form.date,
        category: form.category,
        description: form.description.trim(),
      };

      if (isEdit) {
        await updateExpense(initialData._id || initialData.id, payload);
        toast.success("Gider kaydı güncellendi.");
      } else {
        await createExpense(payload);
        toast.success("Yeni gider başarıyla eklendi.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gider kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant/20 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-600/10 text-red-600 flex items-center justify-center">
              <Receipt size={19} />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {isEdit ? "Gider Kaydını Düzenle" : "Yeni Dükkan Gideri Ekle"}
              </h2>
              <p className="text-xs text-on-surface-variant">
                Maaş, kira, fatura veya diğer işletme giderlerini kaydedin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Tutar (₺) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Örn: 15000"
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Tarih *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Gider Kategorisi *
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Açıklama / Not
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Örn: Kasım ayı mağaza kira ödemesi, elektrik faturası vb."
              className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={16} />
              {submitting ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Gideri Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StoreSettingsModal({ isOpen, onClose, profile, onProfileSaved }) {
  const [form, setForm] = useState({
    ad: "",
    yetkili: "",
    telefon: "",
    adres: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        ad: profile.ad || "",
        yetkili: profile.yetkili || "",
        telefon: profile.telefon || "",
        adres: profile.adres || "",
      });
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ad.trim() || !form.yetkili.trim()) {
      toast.error("Mağaza adı ve yetkili adı zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const result = await updateStoreProfile(form);
      toast.success("Mağaza profili başarıyla güncellendi.");
      onProfileSaved(result);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Mağaza bilgileri güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg border border-outline-variant/20 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Settings size={19} />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">Mağaza Ayarları</h2>
              <p className="text-xs text-on-surface-variant">
                Mağaza kimlik ve iletişim bilgilerini güncelleyin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Mağaza Adı *
            </label>
            <input
              type="text"
              required
              value={form.ad}
              onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
              placeholder="Örn: Güneş Beyaz Eşya Mağazası"
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Yetkili Adı Soyadı *
              </label>
              <input
                type="text"
                required
                value={form.yetkili}
                onChange={(e) => setForm((f) => ({ ...f, yetkili: e.target.value }))}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Telefon Numarası
              </label>
              <input
                type="text"
                value={form.telefon}
                onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
                placeholder="Örn: 0312 555 01 01"
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Açık Adres
            </label>
            <textarea
              rows={3}
              value={form.adres}
              onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))}
              placeholder="Mahalle, cadde, bina no, ilçe / il"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Save size={16} />
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyStorePage({ onSessionRefresh }) {
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(() => now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => now.getMonth() + 1); // 1..12

  const [summary, setSummary] = useState({
    aylikToplamCiro: 0,
    satilanUrunMaliyeti: 0,
    brutSatisKazanci: 0,
    dukkanGiderleri: 0,
    netKazanc: 0,
    satisSayisi: 0,
    satilanUrunAdedi: 0,
    giderSayisi: 0,
    isCurrentMonth: true,
    periodStart: "",
    periodEnd: "",
    expenses: [],
  });
  const [storeProfile, setStoreProfile] = useState(null);
  const [inlineProfileForm, setInlineProfileForm] = useState({
    ad: "",
    yetkili: "",
    telefon: "",
    adres: "",
  });
  const [savingInlineProfile, setSavingInlineProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const loadStoreData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, profileRes] = await Promise.all([
        getMonthlyStoreSummary({ year: selectedYear, month: selectedMonth }),
        getStoreProfile(),
      ]);
      if (summaryRes) {
        setSummary(summaryRes);
      }
      if (profileRes) {
        setStoreProfile(profileRes);
        setInlineProfileForm({
          ad: profileRes.ad || "",
          yetkili: profileRes.yetkili || "",
          telefon: profileRes.telefon || "",
          adres: profileRes.adres || "",
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Mağaza verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const current = new Date();
    setSelectedYear(current.getFullYear());
    setSelectedMonth(current.getMonth() + 1);
  };

  const isCurrentMonthSelected =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  const periodRangeText = useMemo(() => {
    const monthName = MONTH_NAMES[selectedMonth - 1] || "";
    if (isCurrentMonthSelected) {
      return `1 ${monthName} ${selectedYear} – Bugün (${now.getDate()} ${monthName} ${selectedYear})`;
    }
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    return `1 ${monthName} ${selectedYear} – ${lastDay} ${monthName} ${selectedYear}`;
  }, [selectedYear, selectedMonth, isCurrentMonthSelected, now]);

  const filteredExpenses = useMemo(() => {
    const list = Array.isArray(summary.expenses) ? summary.expenses : [];
    if (!categoryFilter) return list;
    return list.filter((item) => item.category === categoryFilter);
  }, [summary.expenses, categoryFilter]);

  const handleDeleteExpense = async (expense) => {
    if (
      !window.confirm(
        `${expense.category} (${formatCurrency(expense.amount)}) gider kaydını silmek istediğinize emin misiniz?`,
      )
    ) {
      return;
    }

    try {
      await deleteExpense(expense._id || expense.id);
      toast.success("Gider kaydı silindi.");
      loadStoreData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gider silinemedi.");
    }
  };

  const handleProfileUpdated = useCallback(
    (result) => {
      if (result?.store) {
        setStoreProfile(result.store);
        setInlineProfileForm({
          ad: result.store.ad || "",
          yetkili: result.store.yetkili || "",
          telefon: result.store.telefon || "",
          adres: result.store.adres || "",
        });
      }
      if (result?.session && typeof onSessionRefresh === "function") {
        onSessionRefresh(result.session);
      }
    },
    [onSessionRefresh],
  );

  const handleInlineProfileSubmit = async (e) => {
    e.preventDefault();
    if (!inlineProfileForm.ad.trim() || !inlineProfileForm.yetkili.trim()) {
      toast.error("Mağaza adı ve yetkili adı zorunludur.");
      return;
    }

    setSavingInlineProfile(true);
    try {
      const result = await updateStoreProfile(inlineProfileForm);
      toast.success("Mağaza profili güncellendi.");
      handleProfileUpdated(result);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Mağaza bilgileri güncellenemedi.");
    } finally {
      setSavingInlineProfile(false);
    }
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  return (
    <div className="space-y-6">
      {/* Üst Başlık + Ay/Yıl Seçici + Aksiyon Butonları */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xs p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Store size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                {storeProfile?.ad || "Mağazam"} — Finansal Özet & Gider Yönetimi
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                Patron Ekranı
              </span>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5 flex flex-wrap items-center gap-2">
              <span>
                Dönem: <strong className="text-on-surface">{periodRangeText}</strong>
              </span>
              {storeProfile?.yetkili ? (
                <span className="text-on-surface-variant/80">
                  • Yetkili: <strong className="text-on-surface">{storeProfile.yetkili}</strong>
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Ay/Yıl Seçici ve Butonlar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-surface-container-low border border-outline-variant/30 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Önceki Ay"
              className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <ChevronLeft size={17} />
            </button>

            <div className="flex items-center gap-1.5 px-1">
              <Calendar size={15} className="text-primary shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                aria-label="Ay Seçimi"
                className="bg-transparent text-sm font-bold text-on-surface focus:outline-hidden cursor-pointer pr-1"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Yıl Seçimi"
                className="bg-transparent text-sm font-bold text-on-surface focus:outline-hidden cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Sonraki Ay"
              className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {!isCurrentMonthSelected && (
            <button
              type="button"
              onClick={handleResetToCurrentMonth}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
            >
              Bu Aya Dön
            </button>
          )}

          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-outline-variant/40 text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Settings size={16} className="text-primary" />
            Mağaza Ayarları
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingExpense(null);
              setExpenseModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            + Yeni Gider Ekle
          </button>
        </div>
      </div>

      {/* 5 Özet Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* 1. Aylık Toplam Ciro */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Aylık Toplam Ciro
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-on-surface tracking-tight">
              {formatCurrency(summary.aylikToplamCiro)}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              {summary.satisSayisi} satış işlemi ({summary.satilanUrunAdedi} adet ürün)
            </p>
          </div>
        </div>

        {/* 2. Satılan Ürün Maliyeti */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Satılan Ürün Maliyeti
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-on-surface tracking-tight">
              {formatCurrency(summary.satilanUrunMaliyeti)}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Satış anındaki alış fiyatları toplamı
            </p>
          </div>
        </div>

        {/* 3. Brüt Satış Kazancı */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Brüt Satış Kazancı
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                summary.brutSatisKazanci >= 0 ? "text-teal-700" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.brutSatisKazanci)}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Aylık Ciro − Satılan Ürün Maliyeti
            </p>
          </div>
        </div>

        {/* 4. Dükkan Giderleri */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Dükkan Giderleri
            </span>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
              <Receipt size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-red-600 tracking-tight">
              {formatCurrency(summary.dukkanGiderleri)}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Bu ay girilen {summary.giderSayisi} gider kalemi
            </p>
          </div>
        </div>

        {/* 5. NET KAZANÇ */}
        <div
          className={`rounded-2xl border p-5 shadow-sm flex flex-col justify-between ${
            summary.netKazanc >= 0
              ? "bg-emerald-50/70 border-emerald-200"
              : "bg-red-50/70 border-red-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-extrabold uppercase tracking-wider ${
                summary.netKazanc >= 0 ? "text-emerald-800" : "text-red-800"
              }`}
            >
              NET KAZANÇ
            </span>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                summary.netKazanc >= 0
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              <Award size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight ${
                summary.netKazanc >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {formatCurrency(summary.netKazanc)}
            </div>
            <p
              className={`text-xs font-medium mt-1 ${
                summary.netKazanc >= 0 ? "text-emerald-700/80" : "text-red-700/80"
              }`}
            >
              Brüt Satış Kazancı − Dükkan Giderleri
            </p>
          </div>
        </div>
      </div>

      {/* Alt Bölüm: Giderler Geçmişi Tablosu + Mağaza Profili Düzenleme Kartı */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Sol 2 Sütun: Giderler Geçmişi Tablosu */}
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Receipt size={18} className="text-red-600" />
                Giderler Geçmişi ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Seçili dönemde kaydedilen maaş, kira, fatura ve diğer işletme giderleri
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-8 pr-3 py-2 rounded-lg border border-outline-variant/30 bg-surface text-xs font-semibold text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  <option value="">Tüm Kategoriler</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:opacity-90 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                Yeni Gider Ekle
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-on-surface-variant text-sm">
              Gider kayıtları yükleniyor...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Receipt size={36} className="mx-auto text-on-surface-variant/30 mb-2" />
              <p className="text-sm font-medium text-on-surface-variant">
                Bu dönem için kayıtlı gider bulunamadı.
              </p>
              <p className="text-xs text-on-surface-variant/70 mt-1">
                &ldquo;+ Yeni Gider Ekle&rdquo; butonuna tıklayarak kira, maaş veya fatura gideri
                ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-semibold">Tarih</th>
                    <th className="text-left px-4 py-3 font-semibold">Kategori</th>
                    <th className="text-left px-4 py-3 font-semibold">Açıklama</th>
                    <th className="text-right px-5 py-3 font-semibold">Tutar</th>
                    <th className="text-center px-4 py-3 font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {filteredExpenses.map((expense) => {
                    const expId = expense._id || expense.id;
                    const badgeStyle =
                      CATEGORY_BADGE_STYLES[expense.category] || CATEGORY_BADGE_STYLES.Diğer;
                    return (
                      <tr
                        key={expId}
                        className="hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-xs font-medium text-on-surface whitespace-nowrap">
                          {new Date(expense.date || expense.createdAt).toLocaleDateString(
                            "tr-TR",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}
                          >
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-on-surface">
                          {expense.description || (
                            <span className="text-on-surface-variant/60 italic">
                              Açıklama belirtilmedi
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-red-600 whitespace-nowrap">
                          -{formatCurrency(expense.amount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpense(expense);
                                setExpenseModalOpen(true);
                              }}
                              title="Gideri Düzenle"
                              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(expense)}
                              title="Gideri Sil"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container-low/80 font-bold border-t border-outline-variant/25">
                    <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase text-on-surface-variant">
                      Toplam Gider ({filteredExpenses.length} Kayıt):
                    </td>
                    <td className="px-5 py-3 text-right text-red-600 font-extrabold">
                      {formatCurrency(
                        filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Sağ Sütun: Mağaza Profili Düzenleme Formu */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/20 bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building2 size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-on-surface">Mağaza Profili & Ayarları</h2>
                <p className="text-[11px] text-on-surface-variant">
                  Üst menüdeki mağaza bilgilerini anında günceller
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleInlineProfileSubmit} className="p-5 space-y-3.5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant mb-1">
                <Store size={13} className="text-primary" />
                Mağaza Adı *
              </label>
              <input
                type="text"
                required
                value={inlineProfileForm.ad}
                onChange={(e) =>
                  setInlineProfileForm((f) => ({ ...f, ad: e.target.value }))
                }
                placeholder="Mağaza adını giriniz"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant mb-1">
                <UserCheck size={13} className="text-primary" />
                Yetkili Adı Soyadı *
              </label>
              <input
                type="text"
                required
                value={inlineProfileForm.yetkili}
                onChange={(e) =>
                  setInlineProfileForm((f) => ({ ...f, yetkili: e.target.value }))
                }
                placeholder="Yetkili ad soyad"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant mb-1">
                <Phone size={13} className="text-primary" />
                Telefon
              </label>
              <input
                type="text"
                value={inlineProfileForm.telefon}
                onChange={(e) =>
                  setInlineProfileForm((f) => ({ ...f, telefon: e.target.value }))
                }
                placeholder="0312 555 01 01"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant mb-1">
                <MapPin size={13} className="text-primary" />
                Açık Adres
              </label>
              <textarea
                rows={3}
                value={inlineProfileForm.adres}
                onChange={(e) =>
                  setInlineProfileForm((f) => ({ ...f, adres: e.target.value }))
                }
                placeholder="Mağaza açık adresi"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingInlineProfile}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save size={15} />
              {savingInlineProfile ? "Güncelleniyor..." : "Mağaza Bilgilerini Güncelle"}
            </button>
          </form>
        </div>
      </div>

      {/* Yeni Gider Ekle / Düzenle Modalı */}
      <ExpenseFormModal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        initialData={editingExpense}
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
        onSaved={loadStoreData}
      />

      {/* Mağaza Ayarları Modalı */}
      <StoreSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        profile={storeProfile}
        onProfileSaved={handleProfileUpdated}
      />
    </div>
  );
}

