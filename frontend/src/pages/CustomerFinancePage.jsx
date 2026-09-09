import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Search,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  X,
  Plus,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { getCustomers } from "../services/customerService";
import {
  getCustomerInstallmentSummary,
  getOverdueInstallments,
  createInstallment,
  createCollection,
  deleteInstallment,
} from "../services/financeService";

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

function NewInstallmentModal({ customerId, onClose, onSuccess, isSubmitting }) {
  const [form, setForm] = useState({
    totalAmount: "",
    installmentCount: 12,
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

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
    });
  };

  const perInstallment =
    form.totalAmount && form.installmentCount
      ? Number(form.totalAmount) / Number(form.installmentCount)
      : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
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
          <div className="flex gap-3">
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

function CollectionModal({ customerId, installment, onClose, onSuccess, isSubmitting }) {
  const [form, setForm] = useState({
    amount: installment?.amount?.toString() || "",
    paymentMethod: "Nakit",
    collectionDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Tahsilat tutarı geçerli olmalıdır");
      return;
    }
    onSuccess({
      customerId,
      installmentId: installment?._id,
      amount: Number(form.amount),
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

export default function CustomerFinancePage() {
  const [customers, setCustomers] = useState([]);
  const [overdueInstallments, setOverdueInstallments] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeView, setActiveView] = useState("list"); // "list" | "detail" | "overdue"
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

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadCustomerDetail = useCallback(async (customer) => {
    setIsDetailLoading(true);
    setSelectedCustomer(customer);
    setActiveView("detail");
    try {
      const data = await getCustomerInstallmentSummary(customer._id || customer.id);
      setCustomerSummary(data);
    } catch {
      toast.error("Müşteri detayı yüklenemedi");
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleCreateInstallment = async (formData) => {
    setIsSubmitting(true);
    try {
      await createInstallment(formData);
      toast.success("Taksit planı oluşturuldu");
      setShowInstallmentModal(false);
      // Müşteri özetini yenile
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

  const handleDeleteInstallment = async (installmentId) => {
    if (!window.confirm("Bu taksiti silmek istiyor musunuz?")) return;
    try {
      await deleteInstallment(installmentId);
      toast.success("Taksit silindi");
      loadCustomerDetail(selectedCustomer);
    } catch {
      toast.error("Taksit silinemedi");
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      `${c.ad} ${c.soyad}`.toLowerCase().includes(q) ||
      c.telefon?.includes(q) ||
      c.tcKimlik?.includes(q)
    );
  });

  // Vadesi geçen müşteri sayısı
  const overdueCustomerCount = new Set(overdueInstallments.map((i) => String(i.customerId?._id || i.customerId))).size;

  return (
    <div className="flex flex-col gap-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finans & Senetler</h1>
          <p className="text-sm text-gray-500 mt-1">Müşteri taksit takibi ve tahsilat yönetimi</p>
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

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-2">
            <Users size={14} /> Toplam Müşteri
          </div>
          <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-red-500 text-xs font-medium mb-2">
            <AlertTriangle size={14} /> Vadesi Geçmiş
          </div>
          <div className="text-2xl font-bold text-red-600">{overdueInstallments.length}</div>
          <div className="text-xs text-gray-400 mt-1">{overdueCustomerCount} farklı müşteri</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-orange-500 text-xs font-medium mb-2">
            <TrendingUp size={14} /> Toplam Gecikmiş
          </div>
          <div className="text-xl font-bold text-orange-600">
            {formatCurrency(overdueInstallments.reduce((s, i) => s + i.amount, 0))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-purple-500 text-xs font-medium mb-2">
            <CreditCard size={14} /> Toplam Alacak
          </div>
          <div className="text-xl font-bold text-purple-600">
            {formatCurrency(customers.reduce((s, c) => s + (c.toplamKalanBakiye || 0), 0))}
          </div>
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
                        <th className="text-right px-4 py-3 text-red-700 font-semibold">Tutar</th>
                        <th className="text-center px-4 py-3 text-red-700 font-semibold">Gecikme</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {overdueInstallments.map((inst) => {
                        const daysLate = Math.floor(
                          (new Date() - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24),
                        );
                        return (
                          <tr key={inst._id} className="hover:bg-red-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {inst.customerId?.ad} {inst.customerId?.soyad}
                              <div className="text-xs text-gray-400">{inst.customerId?.telefon}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{inst.installmentNumber}</td>
                            <td className="px-4 py-3 text-red-600 font-medium">{formatDate(inst.dueDate)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {formatCurrency(inst.amount)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                {daysLate} gün
                              </span>
                            </td>
                            <td className="px-4 py-3">
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
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Müşteri ara (ad, soyad, telefon, TC)..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Müşteri bulunamadı</p>
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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setActiveView("list");
                      setCustomerSummary(null);
                    }}
                    className="text-sm text-blue-600 hover:underline cursor-pointer"
                  >
                    ← Geri Dön
                  </button>
                  <span className="text-gray-300">|</span>
                  <div>
                    <span className="font-bold text-gray-900">
                      {selectedCustomer.ad} {selectedCustomer.soyad}
                    </span>
                    {customerSummary?.summary && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[customerSummary.summary.riskStatus]}`}>
                        Risk: {customerSummary.summary.riskStatus}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInstallmentModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 cursor-pointer"
                  >
                    <Plus size={15} /> Taksit Planı
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInstallment(null);
                      setShowCollectionModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 cursor-pointer"
                  >
                    <Wallet size={15} /> Tahsilat Al
                  </button>
                </div>
              </div>

              {isDetailLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Taksitler yükleniyor...</div>
              ) : customerSummary ? (
                <>
                  {/* Özet Kartlar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Toplam Taksit", value: customerSummary.summary.totalInstallments, color: "text-gray-900" },
                      { label: "Ödenen", value: customerSummary.summary.paidCount, color: "text-green-600" },
                      { label: "Gecikmiş", value: customerSummary.summary.overdueCount, color: "text-red-600" },
                      { label: "Kalan Borç", value: formatCurrency(customerSummary.summary.remainingAmount), color: "text-orange-600" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">{label}</div>
                        <div className={`text-xl font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Taksit Tablosu */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="font-semibold text-gray-900 text-sm">Vade Tablosu</span>
                      <span className="text-xs text-gray-400">{customerSummary.installments.length} taksit</span>
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
                              <th className="text-left px-4 py-3 text-gray-600 font-semibold">Vade Tarihi</th>
                              <th className="text-right px-4 py-3 text-gray-600 font-semibold">Tutar</th>
                              <th className="text-center px-4 py-3 text-gray-600 font-semibold">Durum</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {customerSummary.installments.map((inst) => {
                              const overdue = isOverdue(inst.dueDate, inst.isPaid);
                              return (
                                <tr
                                  key={inst._id}
                                  className={`transition-colors ${overdue ? "bg-red-50/70" : "hover:bg-gray-50"}`}
                                >
                                  <td className="px-4 py-3 font-medium text-gray-900">{inst.installmentNumber}</td>
                                  <td className={`px-4 py-3 ${overdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                                    {formatDate(inst.dueDate)}
                                    {overdue && (
                                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                                        GECİKMİŞ
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                    {formatCurrency(inst.amount)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {inst.isPaid ? (
                                      <span className="flex items-center justify-center gap-1 text-green-600 font-medium text-xs">
                                        <CheckCircle size={13} /> Ödendi
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
                                  <td className="px-4 py-3">
                                    {!inst.isPaid && (
                                      <button
                                        onClick={() => {
                                          setSelectedInstallment(inst);
                                          setShowCollectionModal(true);
                                        }}
                                        className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 cursor-pointer"
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
          onClose={() => setShowInstallmentModal(false)}
          onSuccess={handleCreateInstallment}
          isSubmitting={isSubmitting}
        />
      )}

      {showCollectionModal && selectedCustomer && (
        <CollectionModal
          customerId={selectedCustomer._id || selectedCustomer.id}
          installment={selectedInstallment}
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
