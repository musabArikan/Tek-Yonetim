import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Search,
  Users,
  X,
  ChevronRight,
  Wallet,
  User as UserIcon,
  Phone,
  MapPin,
  Calendar,
  Hash,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import { getCustomers } from "../services/customerService";
import { createCollection } from "../services/financeService";
import { getCustomerTransactions } from "../services/transactionService";
import TransactionTable from "../components/customers/TransactionTable";
import PaymentMethodSelect from "../components/ui/PaymentMethodSelect";

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

const formatCurrency = (amount) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getCustomerDebt = (customer) =>
  Number(customer?.toplamKalanBakiye ?? customer?.kalanBorc ?? 0);

// ─── Tahsilat Al (Borçtan Düş) Modalı ─────────────────────────────────────────

function CollectionModal({
  customer,
  maxAmount,
  onClose,
  onSuccess,
  isSubmitting,
}) {
  const [form, setForm] = useState({
    amount: maxAmount > 0 ? String(maxAmount) : "",
    paymentMethod: "Nakit",
    collectionDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountVal = Number(form.amount);

    if (!amountVal || amountVal <= 0) {
      toast.error("Tahsilat tutarı 0'dan büyük olmalıdır.");
      return;
    }

    if (maxAmount !== undefined && maxAmount > 0 && amountVal > maxAmount) {
      toast.error(
        `Tahsilat tutarı müşterinin kalan borcundan (${formatCurrency(maxAmount)}) fazla olamaz.`,
      );
      return;
    }

    onSuccess({
      customerId: customer._id || customer.id,
      amount: amountVal,
      paymentMethod: form.paymentMethod,
      collectionDate: form.collectionDate,
      notes: form.notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wallet size={20} className="text-emerald-600" />
              Tahsilat Al (Borçtan Düş)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {customer?.ad} {customer?.soyad} cari hesabından düşülecek tutar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="bg-red-50 border border-red-100 text-red-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between">
            <span className="font-medium">Mevcut Toplam Kalan Borç:</span>
            <strong className="text-sm font-extrabold text-red-700">
              {formatCurrency(maxAmount)}
            </strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahsil Edilen Tutar (₺) *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="Örn: 5000"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ödeme Yöntemi
              </label>
              <PaymentMethodSelect
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((p) => ({ ...p, paymentMethod: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahsilat Tarihi
              </label>
              <input
                type="date"
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                value={form.collectionDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, collectionDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Açıklama / Tahsilat Notu
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 resize-none"
              rows={2}
              placeholder="Örn: Elden nakit tahsilat, banka havalesi vb."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Wallet size={16} />
              {isSubmitting ? "Kaydediliyor..." : "Tahsilatı Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ana Sayfa Bileşeni ───────────────────────────────────────────────────────

export default function CustomerFinancePage({ initialCustomerId, onDataRefresh }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  // Varsayılan (default) olarak SADECE güncel borcu olan (kalanBorc > 0) müşteriler listelenir
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeView, setActiveView] = useState("list"); // "list" | "detail"
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  const loadCustomersList = useCallback(async () => {
    setIsLoading(true);
    try {
      const customersRes = await getCustomers();
      const list = Array.isArray(customersRes) ? customersRes : [];
      setCustomers(list);
      return list;
    } catch {
      toast.error("Müşteri listesi yüklenirken hata oluştu.");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCustomerDetail = useCallback(async (customer) => {
    if (!customer) return;
    setIsDetailLoading(true);
    setSelectedCustomer(customer);
    setActiveView("detail");

    try {
      const customerId = customer._id || customer.id;
      const [freshCustomers, txData] = await Promise.all([
        getCustomers().catch(() => []),
        getCustomerTransactions(customerId).catch(() => []),
      ]);

      if (Array.isArray(freshCustomers) && freshCustomers.length > 0) {
        setCustomers(freshCustomers);
        const updatedCustomer = freshCustomers.find(
          (c) => String(c._id || c.id) === String(customerId),
        );
        if (updatedCustomer) {
          setSelectedCustomer(updatedCustomer);
        }
      }

      const normalizedTx = (txData || []).map((t) => ({
        ...t,
        id: t._id || t.id,
        tarih: t.tarih || t.createdAt,
        urunBilgisi:
          (t.urunler || []).length > 0
            ? t.urunler
                .map((item) =>
                  item.urunAdi && item.urunAdi !== item.urunKodu
                    ? `${item.urunKodu} - ${item.urunAdi} (x${item.adet})`
                    : `${item.urunKodu} (x${item.adet})`,
                )
                .join(", ")
            : t.urunBilgisi || "İşlem",
        odenenTutar: t.odenenTutar ?? t.tutar ?? t.toplamTutar ?? t.pesinat ?? 0,
      }));
      setCustomerTransactions(normalizedTx);
    } catch {
      toast.error("Müşteri cari detayları yüklenemedi.");
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomersList().then((list) => {
      if (initialCustomerId) {
        const found = list.find(
          (cust) => String(cust._id || cust.id) === String(initialCustomerId),
        );
        if (found) {
          loadCustomerDetail(found);
        }
      } else {
        setActiveView("list");
        setSelectedCustomer(null);
      }
    });
  }, [loadCustomersList, loadCustomerDetail, initialCustomerId]);

  const handleCreateCollection = async (formData) => {
    setIsSubmitting(true);
    try {
      await createCollection(formData);
      toast.success("Tahsilat kaydedildi ve müşteri borcundan düşüldü.");
      setShowCollectionModal(false);
      await loadCustomerDetail(selectedCustomer);
      if (typeof onDataRefresh === "function") {
        onDataRefresh();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Tahsilat kaydedilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const debt = getCustomerDebt(c);
      if (!showAllCustomers && debt <= 0) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        `${c.ad || ""} ${c.soyad || ""}`.toLowerCase().includes(q) ||
        String(c.musteriNo || "").includes(q) ||
        (c.telefon || "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        (c.tcKimlik || c.tc || "").includes(q)
      );
    });
  }, [customers, showAllCustomers, searchQuery]);

  const debtorCount = useMemo(
    () => customers.filter((c) => getCustomerDebt(c) > 0).length,
    [customers],
  );

  const totalReceivables = useMemo(
    () => customers.reduce((sum, c) => sum + Math.max(0, getCustomerDebt(c)), 0),
    [customers],
  );

  const currentCustomerDebt = getCustomerDebt(selectedCustomer);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Sayfa Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Müşteri Cari & Borç Takibi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Müşteri cari bakiyeleri, tahsilat işlemleri ve alınan ürün geçmişi
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs">
          <div className="text-xs text-slate-500">
            Toplam Alacak ({debtorCount} Borçlu Müşteri):
          </div>
          <div className="text-base font-extrabold text-red-600">
            {formatCurrency(totalReceivables)}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Müşteri cari verileri yükleniyor...
        </div>
      ) : (
        <>
          {/* ─── ANA LİSTE (Varsayılan: Sadece Borçlular) ───────────────── */}
          {activeView === "list" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Müşteri ara (Ad Soyad, Müşteri No, Telefon, TC Kimlik)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={showAllCustomers}
                    onChange={(e) => setShowAllCustomers(e.target.checked)}
                  />
                  Tüm Müşterileri Göster ({customers.length})
                </label>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 text-center py-16 text-slate-400">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-slate-600">
                    {showAllCustomers
                      ? "Arama kriterlerine uygun müşteri bulunamadı."
                      : "Güncel borcu olan müşteri bulunamadı."}
                  </p>
                  {!showAllCustomers && customers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllCustomers(true)}
                      className="mt-3 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Borcu olmayan tüm müşterileri de göster ({customers.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>
                      {showAllCustomers
                        ? `Tüm Müşteriler (${filteredCustomers.length})`
                        : `Sadece Borcu Olan Müşteriler (${filteredCustomers.length})`}
                    </span>
                    <span>Detay ve tahsilat için müşteriye tıklayın</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/70 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="text-left px-5 py-3.5 font-semibold">
                            Müşteri
                          </th>
                          <th className="text-left px-4 py-3.5 font-semibold hidden sm:table-cell">
                            Telefon
                          </th>
                          <th className="text-left px-4 py-3.5 font-semibold hidden md:table-cell">
                            İletişim Adresi
                          </th>
                          <th className="text-right px-5 py-3.5 font-semibold">
                            Toplam Kalan Borç
                          </th>
                          <th className="px-4 py-3.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.map((customer) => {
                          const debt = getCustomerDebt(customer);
                          return (
                            <tr
                              key={customer._id || customer.id}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                              onClick={() => loadCustomerDetail(customer)}
                            >
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-slate-900">
                                  {customer.ad} {customer.soyad}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Müşteri No: #{customer.musteriNo || "-"}
                                  {customer.tcKimlik || customer.tc
                                    ? ` • TC: ${customer.tcKimlik || customer.tc}`
                                    : ""}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-slate-600 hidden sm:table-cell whitespace-nowrap">
                                {customer.telefon || "-"}
                              </td>
                              <td className="px-4 py-3.5 text-slate-500 text-xs hidden md:table-cell max-w-xs truncate">
                                {customer.adres || "-"}
                              </td>
                              <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                <span
                                  className={`font-extrabold text-sm ${
                                    debt > 0 ? "text-red-600" : "text-emerald-600"
                                  }`}
                                >
                                  {formatCurrency(debt)}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <ChevronRight size={16} className="text-slate-400" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── MÜŞTERİ DETAY & CARİ (Tek Ekran Tasarımı) ──────────────── */}
          {activeView === "detail" && selectedCustomer && (
            <div className="flex flex-col gap-6">
              {/* Geri Dön Barı */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("list");
                    setSelectedCustomer(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  Borçlu / Müşteri Listesine Dön
                </button>
              </div>

              {isDetailLoading ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Müşteri cari bilgileri yükleniyor...
                </div>
              ) : (
                <>
                  {/* Üst Bilgi ve Cari Özet Kartları (Tek Ekran) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* Sol Üst: Müşteri Kimlik & İletişim Adresi Kartı */}
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between gap-5">
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <UserIcon size={24} />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-slate-900">
                              {selectedCustomer.ad} {selectedCustomer.soyad}
                            </h2>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md mt-1">
                              <Hash size={12} />
                              Müşteri No: {selectedCustomer.musteriNo || "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <CreditCard size={13} className="text-slate-400" />
                            TC Kimlik No
                          </div>
                          <div className="font-bold text-slate-900 mt-1">
                            {selectedCustomer.tcKimlik || selectedCustomer.tc || "-"}
                          </div>
                        </div>

                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            Telefon
                          </div>
                          <div className="font-bold text-slate-900 mt-1">
                            {selectedCustomer.telefon || "-"}
                          </div>
                        </div>

                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" />
                            Kayıt Tarihi
                          </div>
                          <div className="font-bold text-slate-900 mt-1">
                            {formatDate(
                              selectedCustomer.kayitTarihi || selectedCustomer.createdAt,
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Açık İletişim Adresi */}
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1">
                          <MapPin size={14} className="text-blue-600" />
                          İletişim Adresi (Açık Adres)
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-relaxed">
                          {selectedCustomer.adres || "Kayıtlı açık adres bilgisi bulunmuyor."}
                        </p>
                      </div>
                    </div>

                    {/* Sağ Üst: Büyük Cari Özet Kartı & Global Tahsilat Al Butonu */}
                    <div className="lg:col-span-5 bg-gradient-to-br from-red-50 via-white to-red-50/40 rounded-2xl border-2 border-red-200 p-6 shadow-xs flex flex-col justify-between gap-6">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700">
                          <Wallet size={13} />
                          Müşteri Cari Özeti
                        </span>

                        <div className="mt-5">
                          <div className="text-xs font-bold uppercase tracking-wider text-red-700/80">
                            Toplam Kalan Borç
                          </div>
                          <div className="text-3xl sm:text-4xl font-black text-red-600 tracking-tight mt-1">
                            Toplam Kalan Borç: {formatCurrency(currentCustomerDebt)}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Yapılan her tahsilat doğrudan müşterinin genel cari borcundan düşülür.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-red-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setShowCollectionModal(true)}
                          className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Wallet size={18} />
                          Tahsilat Al (Borçtan Düş)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Alt Tablo: İşlem ve Ürün Geçmişi */}
                  <TransactionTable
                    transactions={customerTransactions}
                    title="İşlem ve Ürün Geçmişi"
                  />
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Tahsilat Al Modalı */}
      {showCollectionModal && selectedCustomer && (
        <CollectionModal
          customer={selectedCustomer}
          maxAmount={currentCustomerDebt}
          onClose={() => setShowCollectionModal(false)}
          onSuccess={handleCreateCollection}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
