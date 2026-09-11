import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Search,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Plus,
  ChevronRight,
  Wallet,
  User as UserIcon,
  ShoppingBag,
  List,
} from "lucide-react";
import { getCustomers } from "../services/customerService";
import {
  getCustomerInstallmentSummary,
  getOverdueInstallments,
  createInstallment,
  createCollection,
  deleteInstallment,
} from "../services/financeService";
import { getCustomerTransactions } from "../services/transactionService";
import TransactionTable from "../components/customers/TransactionTable";

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

const formatCurrency = (amount) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(amount || 0);

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isOverdue = (dueDate, isPaid) => {
  if (isPaid) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(dueDate) < now;
};

const RISK_COLORS = {
  Düşük: "bg-green-100 text-green-700",
  Orta: "bg-yellow-100 text-yellow-700",
  Yüksek: "bg-red-100 text-red-700",
};

// ─── Taksit Oluşturma Modal ───────────────────────────────────────────────────

function NewInstallmentModal({ customerId, customerTransactions = [], onClose, onSuccess, isSubmitting }) {
  const allProducts = useMemo(() => {
    const products = [];
    customerTransactions.forEach((tx) => {
      if (tx.urunler && Array.isArray(tx.urunler)) {
        tx.urunler.forEach((u) => {
          if (u.urunKodu) {
            products.push(u.urunKodu);
          }
        });
      }
    });
    return [...new Set(products)];
  }, [customerTransactions]);

  const [form, setForm] = useState({
    totalAmount: "",
    installmentCount: 12,
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
    selectedProducts: [],
  });

  const toggleProduct = (prod) => {
    setForm((p) => ({
      ...p,
      selectedProducts: p.selectedProducts.includes(prod)
        ? p.selectedProducts.filter((x) => x !== prod)
        : [...p.selectedProducts, prod],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.totalAmount || Number(form.totalAmount) <= 0) {
      toast.error("Toplam tutar geçerli olmalıdır");
      return;
    }
    onSuccess({
      customerId,
      totalAmount: Number(form.totalAmount),
      installmentCount: Number(form.installmentCount),
      startDate: form.startDate,
      notes: form.notes,
      productNames: form.selectedProducts,
    });
  };

  const perInstallment =
    form.totalAmount && form.installmentCount
      ? Number(form.totalAmount) / Number(form.installmentCount)
      : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={20} className="text-purple-600" />
            Yeni Taksit Planı
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Tutar (₺)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0.00"
              value={form.totalAmount}
              onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taksit Sayısı</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={form.installmentCount}
              onChange={(e) => setForm((p) => ({ ...p, installmentCount: e.target.value }))}
            >
              {[1, 2, 3, 6, 9, 12, 18, 24, 36, 48, 60].map((n) => (
                <option key={n} value={n}>{n} Taksit</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İlk Vade Tarihi</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
          </div>
          {allProducts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ürün İlişkilendir</label>
              <div className="flex flex-wrap gap-2 border border-gray-200 p-3 rounded-lg max-h-32 overflow-y-auto">
                {allProducts.map((prod) => (
                  <label key={prod} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.selectedProducts.includes(prod)}
                      onChange={() => toggleProduct(prod)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    {prod}
                  </label>
                ))}
              </div>
            </div>
          )}
          {perInstallment > 0 && (
            <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700 font-medium">
              Aylık taksit: {formatCurrency(perInstallment)}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 cursor-pointer">
              İptal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 disabled:opacity-60 cursor-pointer">
              {isSubmitting ? "Oluşturuluyor..." : "Plan Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tahsilat Modal ───────────────────────────────────────────────────────────

function CollectionModal({ customerId, installment, maxAmount, onClose, onSuccess, isSubmitting }) {
  const initialAmount = installment
    ? Math.max(0, installment.amount - (installment.paidAmount || 0))
    : "";

  const [form, setForm] = useState({
    amount: initialAmount.toString(),
    paymentMethod: "Nakit",
    collectionDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountVal = Number(form.amount);
    
    if (!amountVal || amountVal <= 0) {
      toast.error("Tahsilat tutarı geçerli olmalıdır");
      return;
    }
    
    if (maxAmount !== undefined && amountVal > maxAmount) {
      toast.error(`Tahsilat tutarı maksimum ${formatCurrency(maxAmount)} olabilir.`);
      return;
    }

    onSuccess({
      customerId,
      installmentId: installment?._id,
      amount: amountVal,
      paymentMethod: form.paymentMethod,
      collectionDate: form.collectionDate,
      notes: form.notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Wallet size={20} className="text-emerald-600" />
            Tahsilat Al
            {installment && (
              <span className="text-sm font-normal text-gray-500">— Taksit {installment.installmentNumber}</span>
            )}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {maxAmount !== undefined && (
            <div className="bg-blue-50 text-blue-800 text-xs px-3 py-2 rounded-lg mb-2">
              Maksimum tahsil edilebilir tutar: <strong>{formatCurrency(maxAmount)}</strong>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.paymentMethod}
              onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
            >
              {["Nakit", "Kart", "Havale", "EFT", "Çek", "Diğer"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahsilat Tarihi</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.collectionDate}
              onChange={(e) => setForm((p) => ({ ...p, collectionDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 cursor-pointer">
              İptal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-60 cursor-pointer">
              {isSubmitting ? "Kaydediliyor..." : "Tahsilat Al"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ana Sayfa Bileşeni ───────────────────────────────────────────────────────

export default function CustomerFinancePage({ initialCustomerId }) {
  const [customers, setCustomers] = useState([]);
  const [overdueInstallments, setOverdueInstallments] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyDebtors, setShowOnlyDebtors] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeView, setActiveView] = useState("list"); // "list" | "detail" | "overdue"
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "finance"
  
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [customersRes, overdueRes] = await Promise.all([
        getCustomers(),
        getOverdueInstallments(),
      ]);
      setCustomers(customersRes || []);
      setOverdueInstallments(overdueRes || []);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCustomerDetail = useCallback(async (customer) => {
    setIsDetailLoading(true);
    setSelectedCustomer(customer);
    setActiveView("detail");
    setActiveTab("profile"); // Default to profile tab
    try {
      const [summaryData, txData] = await Promise.all([
        getCustomerInstallmentSummary(customer._id || customer.id),
        getCustomerTransactions(customer._id || customer.id).catch(() => []),
      ]);
      setCustomerSummary(summaryData);
      // Normalize transactions
      const normalizedTx = (txData || []).map(t => ({
        ...t,
        id: t._id || t.id,
        tarih: t.tarih || t.createdAt,
        urunBilgisi: (t.urunler || []).length > 0
          ? t.urunler.map(item => `${item.urunKodu} (x${item.adet})`).join(", ")
          : (t.urunBilgisi || "İşlem"),
        odenenTutar: t.odenenTutar ?? t.tutar ?? t.toplamTutar ?? t.pesinat ?? 0,
      }));
      setCustomerTransactions(normalizedTx);
    } catch {
      toast.error("Müşteri detayı yüklenemedi");
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData().then(() => {
      if (initialCustomerId) {
        getCustomers().then((res) => {
          const c = (res || []).find(
            (cust) =>
              String(cust._id || cust.id) === String(initialCustomerId)
          );
          if (c) {
            loadCustomerDetail(c);
          }
        });
      } else {
        // If no initialCustomerId, always show list
        setActiveView("list");
        setSelectedCustomer(null);
        setCustomerSummary(null);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadInitialData, initialCustomerId]); // Only run when these change

  const handleCreateInstallment = async (formData) => {
    setIsSubmitting(true);
    try {
      await createInstallment(formData);
      toast.success("Taksit planı oluşturuldu");
      setShowInstallmentModal(false);
      loadCustomerDetail(selectedCustomer);
      loadInitialData();
    } catch {
      toast.error("Taksit planı oluşturulamadı");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCollection = async (formData) => {
    setIsSubmitting(true);
    try {
      await createCollection(formData);
      toast.success("Tahsilat başarıyla kaydedildi");
      setShowCollectionModal(false);
      setSelectedInstallment(null);
      loadCustomerDetail(selectedCustomer);
      loadInitialData();
    } catch {
      toast.error("Tahsilat kaydedilemedi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (showOnlyDebtors && c.toplamKalanBakiye <= 0) return false;
    
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      `${c.ad} ${c.soyad}`.toLowerCase().includes(q) ||
      c.telefon?.includes(q) ||
      c.tcKimlik?.includes(q)
    );
  });

  const overdueCustomerCount = new Set(overdueInstallments.map((i) => String(i.customerId?._id || i.customerId))).size;

  // Hesaplamalar
  const totalDebt = customerSummary?.customer?.toplamKalanBakiye || 0;
  const installmentDebt = customerSummary?.installments
    ?.filter(i => !i.isPaid)
    .reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0) || 0;
  
  const openAccountDebt = Math.max(0, totalDebt - installmentDebt);

  return (
    <div className="flex flex-col gap-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteri Detayları & Finans</h1>
          <p className="text-sm text-gray-500 mt-1">Müşteri hesapları, işlemler ve taksit takibi</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveView("overdue")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer shadow-sm ${
              activeView === "overdue"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            <AlertTriangle size={16} />
            Vadesi Geçenler {overdueInstallments.length > 0 && `(${overdueInstallments.length})`}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Yükleniyor...</div>
      ) : (
        <>
          {/* ─── Vadesi Geçenler ─────────────────────────────────────── */}
          {activeView === "overdue" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView("list")}
                  className="text-sm text-blue-600 hover:underline cursor-pointer"
                >
                  ← Müşteri Listesine Dön
                </button>
                <span className="text-gray-300">|</span>
                <span className="text-sm font-semibold text-red-700">
                  {overdueInstallments.length} Gecikmiş Taksit
                </span>
              </div>

              {overdueInstallments.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <CheckCircle size={40} className="mx-auto mb-3 text-green-400 opacity-60" />
                  <p className="font-medium">Vadesi geçmiş taksit bulunmuyor 🎉</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-red-100 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-red-700 font-semibold">Müşteri</th>
                        <th className="text-left px-4 py-3 text-red-700 font-semibold">Taksit No</th>
                        <th className="text-left px-4 py-3 text-red-700 font-semibold">Vade Tarihi</th>
                        <th className="text-right px-4 py-3 text-red-700 font-semibold">Kalan Tutar</th>
                        <th className="text-center px-4 py-3 text-red-700 font-semibold">Gecikme</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {overdueInstallments.map((inst) => {
                        const daysLate = Math.floor(
                          (new Date() - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24),
                        );
                        const remaining = inst.amount - (inst.paidAmount || 0);
                        return (
                          <tr key={inst._id} className="hover:bg-red-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {inst.customerId?.ad} {inst.customerId?.soyad}
                              <div className="text-xs text-gray-400">{inst.customerId?.telefon}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{inst.installmentNumber}</td>
                            <td className="px-4 py-3 text-red-600 font-medium">{formatDate(inst.dueDate)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {formatCurrency(remaining)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                {daysLate} gün
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedInstallment(inst);
                                  const customer = { _id: inst.customerId?._id, ...inst.customerId };
                                  setSelectedCustomer(customer);
                                  setShowCollectionModal(true);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 cursor-pointer"
                              >
                                Tahsilat Al
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Müşteri Listesi ─────────────────────────────────────── */}
          {activeView === "list" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Müşteri ara (ad, soyad, telefon, TC)..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      checked={showOnlyDebtors}
                      onChange={(e) => setShowOnlyDebtors(e.target.checked)}
                    />
                    Sadece Borçluları Göster
                  </label>
                </div>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Kriterlere uygun müşteri bulunamadı</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-600 font-semibold">Müşteri</th>
                        <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Telefon</th>
                        <th className="text-right px-4 py-3 text-gray-600 font-semibold">Kalan Borç</th>
                        <th className="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Risk</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredCustomers.map((customer) => {
                        const hasOverdue = overdueInstallments.some(
                          (i) => String(i.customerId?._id || i.customerId) === String(customer._id || customer.id),
                        );
                        return (
                          <tr
                            key={customer._id || customer.id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => loadCustomerDetail(customer)}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 flex items-center gap-2">
                                {customer.ad} {customer.soyad}
                                {hasOverdue && (
                                  <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="Vadesi geçmiş taksit var" />
                                )}
                              </div>
                              <div className="text-xs text-gray-400">Müşteri No: {customer.musteriNo}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{customer.telefon}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-bold ${customer.toplamKalanBakiye > 0 ? "text-orange-600" : "text-gray-400"}`}>
                                {formatCurrency(customer.toplamKalanBakiye)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center hidden md:table-cell">
                              {hasOverdue ? (
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">Yüksek</span>
                              ) : customer.toplamKalanBakiye > 0 ? (
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">Orta</span>
                              ) : (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Düşük</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <ChevronRight size={16} className="text-gray-400" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Müşteri Detay ───────────────────────────────────────── */}
          {activeView === "detail" && selectedCustomer && (
            <div className="flex flex-col gap-4">
              {/* Geri Dön + Başlık */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveView("list");
                    setCustomerSummary(null);
                  }}
                  className="text-sm text-blue-600 hover:underline cursor-pointer"
                >
                  ← Listeye Dön
                </button>
                <span className="text-gray-300">|</span>
                <span className="font-bold text-gray-900 text-lg">
                  {selectedCustomer.ad} {selectedCustomer.soyad}
                </span>
                {customerSummary?.summary && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[customerSummary.summary.riskStatus]}`}>
                    Risk: {customerSummary.summary.riskStatus}
                  </span>
                )}
              </div>

              {/* Sekmeler */}
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === "profile"
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UserIcon size={18} />
                  Profil & İşlemler
                </button>
                <button
                  onClick={() => setActiveTab("finance")}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === "finance"
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <CreditCard size={18} />
                  Finans & Senetler
                </button>
              </div>

              {isDetailLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Detaylar yükleniyor...</div>
              ) : customerSummary ? (
                <>
                  {activeTab === "profile" && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-3">
                          <h3 className="font-semibold text-gray-900 text-sm border-b pb-2">Müşteri Bilgileri</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Müşteri No</div>
                              <div className="font-medium">{selectedCustomer.musteriNo || "-"}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">TC Kimlik</div>
                              <div className="font-medium">{selectedCustomer.tcKimlik || "-"}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Telefon</div>
                              <div className="font-medium">{selectedCustomer.telefon || "-"}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Kayıt Tarihi</div>
                              <div className="font-medium">{formatDate(selectedCustomer.createdAt)}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <h3 className="font-semibold text-gray-900 text-sm border-b pb-2">İletişim Adresi</h3>
                          <div className="text-sm text-gray-700">
                            {selectedCustomer.adres || "Adres bilgisi bulunmuyor."}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-100">
                          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                            <List size={18} /> İşlem Geçmişi
                          </h3>
                        </div>
                        <TransactionTable transactions={customerTransactions} />
                      </div>
                    </div>
                  )}

                  {activeTab === "finance" && (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <h2 className="text-lg font-bold text-gray-900">Finans Özeti</h2>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowInstallmentModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 cursor-pointer"
                          >
                            <Plus size={15} /> Yeni Taksit Planı
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInstallment(null);
                              setShowCollectionModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 cursor-pointer"
                          >
                            <Wallet size={15} /> Açık Hesaba Tahsilat
                          </button>
                        </div>
                      </div>

                      {/* Özet Kartlar */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                          <div className="text-sm text-gray-500 mb-1">Açık Hesap (Alım) Borcu</div>
                          <div className="text-2xl font-bold text-red-600">{formatCurrency(openAccountDebt)}</div>
                          <div className="text-xs text-gray-400 mt-1">Taksitlendirilmemiş düz borç</div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                          <div className="text-sm text-gray-500 mb-1">Vade (Taksit) Borcu</div>
                          <div className="text-2xl font-bold text-orange-600">{formatCurrency(installmentDebt)}</div>
                          <div className="text-xs text-gray-400 mt-1">Ödenmemiş taksitlerin toplamı</div>
                        </div>
                        <div className="bg-white rounded-xl border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
                          <div className="text-sm text-blue-700 font-medium mb-1">Toplam Bakiye (Genel Borç)</div>
                          <div className="text-2xl font-bold text-blue-800">{formatCurrency(totalDebt)}</div>
                          <div className="text-xs text-blue-600/70 mt-1">Açık Hesap + Vade Borcu</div>
                        </div>
                      </div>

                      {/* Taksit Tablosu */}
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                          <span className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                            <Clock size={18} /> Vade / Taksit Tablosu
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md font-medium">
                            {customerSummary.installments.length} Taksit
                          </span>
                        </div>
                        {customerSummary.installments.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 text-sm">
                            <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
                            Taksit kaydı bulunmuyor
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Taksit</th>
                                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">İlişkili Ürün & Not</th>
                                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Vade Tarihi</th>
                                  <th className="text-right px-4 py-3 text-gray-600 font-semibold">Tutar</th>
                                  <th className="text-right px-4 py-3 text-gray-600 font-semibold">Kalan Borç</th>
                                  <th className="text-center px-4 py-3 text-gray-600 font-semibold">Durum</th>
                                  <th className="px-4 py-3"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {customerSummary.installments.map((inst, index) => {
                                  const overdue = isOverdue(inst.dueDate, inst.isPaid);
                                  const remaining = inst.amount - (inst.paidAmount || 0);
                                  const hasPreviousUnpaid = customerSummary.installments
                                    .slice(0, index)
                                    .some(prev => !prev.isPaid && prev.groupId === inst.groupId);
                                    
                                  return (
                                    <tr
                                      key={inst._id}
                                      className={`transition-colors ${overdue ? "bg-red-50/70" : "hover:bg-gray-50"}`}
                                    >
                                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                        {inst.installmentNumber}
                                      </td>
                                      <td className="px-4 py-3 text-gray-600 text-xs">
                                        {inst.productNames && inst.productNames.length > 0 && (
                                          <div className="font-semibold text-purple-700 mb-0.5">
                                            {inst.productNames.join(", ")}
                                          </div>
                                        )}
                                        {inst.notes && <div>{inst.notes}</div>}
                                        {!inst.notes && (!inst.productNames || inst.productNames.length === 0) && "-"}
                                      </td>
                                      <td className={`px-4 py-3 whitespace-nowrap ${overdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                                        {formatDate(inst.dueDate)}
                                      </td>
                                      <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                                        {formatCurrency(inst.amount)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                                        {formatCurrency(remaining)}
                                      </td>
                                      <td className="px-4 py-3 text-center whitespace-nowrap">
                                        {inst.status === "Ödendi" || remaining === 0 ? (
                                          <span className="flex items-center justify-center gap-1 text-green-600 font-medium text-xs">
                                            <CheckCircle size={13} /> Ödendi
                                          </span>
                                        ) : inst.status === "Kısmi Ödendi" || remaining < inst.amount ? (
                                          <span className="flex items-center justify-center gap-1 text-blue-600 font-medium text-xs">
                                            <Wallet size={13} /> Kısmi Ödendi
                                          </span>
                                        ) : overdue ? (
                                          <span className="flex items-center justify-center gap-1 text-red-600 font-medium text-xs">
                                            <AlertTriangle size={13} /> Gecikmiş
                                          </span>
                                        ) : (
                                          <span className="flex items-center justify-center gap-1 text-yellow-600 font-medium text-xs">
                                            <Clock size={13} /> Bekliyor
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right whitespace-nowrap">
                                        {!inst.isPaid && remaining > 0 && (
                                          <button
                                            onClick={() => {
                                              if (hasPreviousUnpaid) {
                                                toast.warning("Önceki taksitleri ödemeden bu taksiti tahsil edemezsiniz.");
                                                return;
                                              }
                                              setSelectedInstallment(inst);
                                              setShowCollectionModal(true);
                                            }}
                                            disabled={hasPreviousUnpaid}
                                            title={hasPreviousUnpaid ? "Önceki taksit(ler) ödenmemiş!" : ""}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                              hasPreviousUnpaid 
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                            }`}
                                          >
                                            Tahsil Et
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* Modallar */}
      {showInstallmentModal && selectedCustomer && (
        <NewInstallmentModal
          customerId={selectedCustomer._id || selectedCustomer.id}
          customerTransactions={customerTransactions}
          onClose={() => setShowInstallmentModal(false)}
          onSuccess={handleCreateInstallment}
          isSubmitting={isSubmitting}
        />
      )}

      {showCollectionModal && selectedCustomer && (
        <CollectionModal
          customerId={selectedCustomer._id || selectedCustomer.id}
          installment={selectedInstallment}
          maxAmount={selectedInstallment ? (selectedInstallment.amount - (selectedInstallment.paidAmount || 0)) : openAccountDebt}
          onClose={() => {
            setShowCollectionModal(false);
            setSelectedInstallment(null);
          }}
          onSuccess={handleCreateCollection}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
