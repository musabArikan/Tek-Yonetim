import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Plus, Truck, ArrowLeftRight, Check, X, Calendar, ChevronDown, ChevronUp, Package, MapPin, User } from "lucide-react";
import { getBranches, createBranch } from "../services/branchService";
import { getTransfers, createTransfer, updateTransferStatus, deleteTransfer } from "../services/transferService";
import { getShipments, createShipment, updateShipment, deleteShipment } from "../services/shipmentService";

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

const STATUS_COLORS = {
  Beklemede: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Onaylandı: "bg-green-100 text-green-800 border border-green-200",
  Reddedildi: "bg-red-100 text-red-800 border border-red-200",
  Planlandı: "bg-blue-100 text-blue-800 border border-blue-200",
  Yolda: "bg-orange-100 text-orange-800 border border-orange-200",
  "Teslim Edildi": "bg-green-100 text-green-800 border border-green-200",
  İptal: "bg-gray-100 text-gray-600 border border-gray-200",
};

// ─── Transfer Formu ───────────────────────────────────────────────────────────

function TransferForm({ branches, onSubmit, onClose, isSubmitting }) {
  const [form, setForm] = useState({
    fromBranch: "",
    toBranch: "",
    notes: "",
    products: [{ urunKodu: "", urunAdi: "", adet: 1 }],
  });

  const updateProduct = (idx, field, value) => {
    setForm((prev) => {
      const products = [...prev.products];
      products[idx] = { ...products[idx], [field]: field === "adet" ? Number(value) : value };
      return { ...prev, products };
    });
  };

  const addProduct = () =>
    setForm((prev) => ({
      ...prev,
      products: [...prev.products, { urunKodu: "", urunAdi: "", adet: 1 }],
    }));

  const removeProduct = (idx) =>
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== idx),
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fromBranch || !form.toBranch) {
      toast.error("Kaynak ve hedef şube seçiniz");
      return;
    }
    if (form.fromBranch === form.toBranch) {
      toast.error("Kaynak ve hedef şube aynı olamaz");
      return;
    }
    if (form.products.some((p) => !p.urunKodu.trim())) {
      toast.error("Tüm ürünlerin kodunu giriniz");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight size={20} className="text-blue-600" />
            Yeni Transfer Talebi
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak Şube</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.fromBranch}
                onChange={(e) => setForm((p) => ({ ...p, fromBranch: e.target.value }))}
              >
                <option value="">Seçiniz...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.ad}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Şube</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.toBranch}
                onChange={(e) => setForm((p) => ({ ...p, toBranch: e.target.value }))}
              >
                <option value="">Seçiniz...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.ad}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Ürünler</label>
              <button
                type="button"
                onClick={addProduct}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                + Ürün Ekle
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.products.map((product, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Ürün Kodu"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={product.urunKodu}
                    onChange={(e) => updateProduct(idx, "urunKodu", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Ürün Adı"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={product.urunAdi}
                    onChange={(e) => updateProduct(idx, "urunAdi", e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Adet"
                    className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={product.adet}
                    onChange={(e) => updateProduct(idx, "adet", e.target.value)}
                  />
                  {form.products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(idx)}
                      className="p-2 text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Ek açıklama (isteğe bağlı)"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? "Kaydediliyor..." : "Transfer Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sevkiyat Formu ───────────────────────────────────────────────────────────

function ShipmentForm({ onSubmit, onClose, isSubmitting }) {
  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    deliveryDate: formatDateInput(new Date()),
    vehicleInfo: { plaka: "", sofor: "", aracTuru: "" },
    notes: "",
    products: [{ urunKodu: "", urunAdi: "", adet: 1 }],
  });

  const updateProduct = (idx, field, value) => {
    setForm((prev) => {
      const products = [...prev.products];
      products[idx] = { ...products[idx], [field]: field === "adet" ? Number(value) : value };
      return { ...prev, products };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.customerId.trim()) {
      toast.error("Müşteri ID giriniz");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Truck size={20} className="text-green-600" />
            Yeni Sevkiyat Planla
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri ID</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Müşteri ID giriniz"
              value={form.customerId}
              onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teslimat Tarihi</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.deliveryDate}
              onChange={(e) => setForm((p) => ({ ...p, deliveryDate: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Plaka</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="34 ABC 123"
                value={form.vehicleInfo.plaka}
                onChange={(e) =>
                  setForm((p) => ({ ...p, vehicleInfo: { ...p.vehicleInfo, plaka: e.target.value } }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Şoför</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Şoför adı"
                value={form.vehicleInfo.sofor}
                onChange={(e) =>
                  setForm((p) => ({ ...p, vehicleInfo: { ...p.vehicleInfo, sofor: e.target.value } }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Araç Türü</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Kamyonet"
                value={form.vehicleInfo.aracTuru}
                onChange={(e) =>
                  setForm((p) => ({ ...p, vehicleInfo: { ...p.vehicleInfo, aracTuru: e.target.value } }))
                }
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Ürünler</label>
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    products: [...p.products, { urunKodu: "", urunAdi: "", adet: 1 }],
                  }))
                }
                className="text-xs text-green-600 hover:text-green-800 font-medium cursor-pointer"
              >
                + Ekle
              </button>
            </div>
            {form.products.map((product, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  placeholder="Ürün Kodu"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={product.urunKodu}
                  onChange={(e) => updateProduct(idx, "urunKodu", e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={product.adet}
                  onChange={(e) => updateProduct(idx, "adet", e.target.value)}
                />
              </div>
            ))}
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

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 cursor-pointer">
              İptal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-60 cursor-pointer">
              {isSubmitting ? "Kaydediliyor..." : "Sevkiyat Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ana Sayfa Bileşeni ───────────────────────────────────────────────────────

export default function TransferShipmentPage() {
  const [activeTab, setActiveTab] = useState("transfers");
  const [transfers, setTransfers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferFilter, setTransferFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [branchRes, transferRes, shipmentRes] = await Promise.all([
        getBranches(),
        getTransfers(),
        getShipments({ date: selectedDate }),
      ]);
      setBranches(branchRes || []);
      setTransfers(transferRes || []);
      setShipments(shipmentRes || []);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTransfer = async (formData) => {
    setIsSubmitting(true);
    try {
      await createTransfer(formData);
      toast.success("Transfer talebi oluşturuldu");
      setShowTransferForm(false);
      loadData();
    } catch {
      toast.error("Transfer oluşturulamadı");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateShipment = async (formData) => {
    setIsSubmitting(true);
    try {
      await createShipment(formData);
      toast.success("Sevkiyat planlandı");
      setShowShipmentForm(false);
      loadData();
    } catch {
      toast.error("Sevkiyat oluşturulamadı");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveTransfer = async (transferId, status) => {
    try {
      await updateTransferStatus(transferId, status);
      toast.success(status === "Onaylandı" ? "Transfer onaylandı" : "Transfer reddedildi");
      loadData();
    } catch {
      toast.error("İşlem başarısız");
    }
  };

  const handleDeleteTransfer = async (transferId) => {
    if (!window.confirm("Bu transferi silmek istiyor musunuz?")) return;
    try {
      await deleteTransfer(transferId);
      toast.success("Transfer silindi");
      loadData();
    } catch {
      toast.error("Silinemedi");
    }
  };

  const handleUpdateShipmentStatus = async (shipmentId, status) => {
    try {
      await updateShipment(shipmentId, { status });
      toast.success("Sevkiyat durumu güncellendi");
      loadData();
    } catch {
      toast.error("Güncelleme başarısız");
    }
  };

  const filteredTransfers =
    transferFilter === "all"
      ? transfers
      : transfers.filter((t) => t.status === transferFilter);

  return (
    <div className="flex flex-col gap-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer & Sevkiyat</h1>
          <p className="text-sm text-gray-500 mt-1">Şubeler arası ürün transferleri ve sevkiyat takibi</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransferForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeftRight size={16} />
            Yeni Transfer
          </button>
          <button
            onClick={() => setShowShipmentForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-colors cursor-pointer shadow-sm"
          >
            <Truck size={16} />
            Sevkiyat Planla
          </button>
        </div>
      </div>

      {/* Sekme */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("transfers")}
          className={`px-6 py-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === "transfers"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <ArrowLeftRight size={15} className="inline mr-2" />
          Transferler ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab("shipments")}
          className={`px-6 py-3 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
            activeTab === "shipments"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Truck size={15} className="inline mr-2" />
          Sevkiyat Takvimi
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500 text-sm">Yükleniyor...</div>
      )}

      {/* ─── Transferler Sekmesi ─────────────────────────────────────── */}
      {!isLoading && activeTab === "transfers" && (
        <div className="flex flex-col gap-4">
          {/* Filtre */}
          <div className="flex gap-2 flex-wrap">
            {["all", "Beklemede", "Onaylandı", "Reddedildi"].map((f) => (
              <button
                key={f}
                onClick={() => setTransferFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  transferFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "Tümü" : f}
              </button>
            ))}
          </div>

          {filteredTransfers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Transfer bulunamadı</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTransfers.map((transfer) => (
                <div
                  key={transfer._id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <ArrowLeftRight size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {transfer.fromBranch?.ad ?? "?"} → {transfer.toBranch?.ad ?? "?"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[transfer.status]}`}>
                          {transfer.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {transfer.products.length} kalem ürün •{" "}
                        {transfer.createdBy?.ad} {transfer.createdBy?.soyad} •{" "}
                        {formatDate(transfer.createdAt)}
                      </div>
                      {transfer.notes && (
                        <div className="text-xs text-gray-400 mt-1 italic">"{transfer.notes}"</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {transfer.status === "Beklemede" && (
                      <>
                        <button
                          onClick={() => handleApproveTransfer(transfer._id, "Onaylandı")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 cursor-pointer"
                        >
                          <Check size={13} /> Onayla
                        </button>
                        <button
                          onClick={() => handleApproveTransfer(transfer._id, "Reddedildi")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 cursor-pointer"
                        >
                          <X size={13} /> Reddet
                        </button>
                      </>
                    )}
                    {transfer.status === "Beklemede" && (
                      <button
                        onClick={() => handleDeleteTransfer(transfer._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Sil"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Sevkiyat Sekmesi ────────────────────────────────────────── */}
      {!isLoading && activeTab === "shipments" && (
        <div className="flex flex-col gap-4">
          {/* Tarih Seçici */}
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <span className="text-sm text-gray-500">{shipments.length} sevkiyat</span>
          </div>

          {shipments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Bu tarihte sevkiyat bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shipments.map((shipment) => (
                <div key={shipment._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Truck size={16} className="text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">
                          {shipment.customerId?.ad} {shipment.customerId?.soyad}
                        </div>
                        <div className="text-xs text-gray-500">{shipment.customerId?.telefon}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[shipment.status]}`}>
                      {shipment.status}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-gray-600">
                    {shipment.vehicleInfo?.plaka && (
                      <div className="flex items-center gap-1">
                        <MapPin size={12} /> {shipment.vehicleInfo.plaka} — {shipment.vehicleInfo.sofor}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Package size={12} /> {shipment.products.length} kalem ürün
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} /> Teslimat: {formatDate(shipment.deliveryDate)}
                    </div>
                  </div>

                  {/* Durum güncelleme */}
                  <div className="flex gap-2 pt-1 border-t border-gray-50">
                    {["Planlandı", "Yolda", "Teslim Edildi"].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdateShipmentStatus(shipment._id, s)}
                        disabled={shipment.status === s}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          shipment.status === s
                            ? "bg-gray-100 text-gray-400 cursor-default"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showTransferForm && (
        <TransferForm
          branches={branches}
          onSubmit={handleCreateTransfer}
          onClose={() => setShowTransferForm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {showShipmentForm && (
        <ShipmentForm
          onSubmit={handleCreateShipment}
          onClose={() => setShowShipmentForm(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
