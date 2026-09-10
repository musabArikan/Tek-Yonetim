import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  History,
  PackagePlus,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
  addStockMovement,
  cancelStockMovement,
  createProduct,
  deleteProduct,
  getProducts,
  getStockMovements,
  updateProduct,
} from "../services/productService";

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
const formatCurrency = (val) =>
  Number(val || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const EMPTY_PRODUCT = {
  ad: "",
  kategori: "",
  barkod: "",
  seriNo: "",
  alisFiyati: "",
  satisFiyati: "",
  mevcutStok: "",
  kritikStokSeviyesi: "5",
  garantiSuresi: "0",
  tedarikci: "",
};

const MOVEMENT_TYPES = ["Giriş", "Çıkış", "Transfer"];

// ─── Alt Bileşenler ───────────────────────────────────────────────────────────

/** Giriş alanı */
function Field({ label, id, type = "text", value, onChange, min, step, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-on-surface-variant">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
      />
    </div>
  );
}

/** Modal çerçevesi */
function Modal({ isOpen, onClose, title, children, width = "max-w-lg" }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`relative w-full ${width} max-h-[92vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl border border-outline-variant`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface rounded-t-2xl">
          <h2 className="text-base font-bold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Ürün Formu Modalı ────────────────────────────────────────────────────────
function ProductFormModal({ isOpen, onClose, onSave, initial = null }) {
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        initial
          ? {
              ad: initial.ad || "",
              kategori: initial.kategori || "",
              barkod: initial.barkod || "",
              seriNo: initial.seriNo || "",
              alisFiyati: String(initial.alisFiyati ?? ""),
              satisFiyati: String(initial.satisFiyati ?? ""),
              mevcutStok: String(initial.mevcutStok ?? ""),
              kritikStokSeviyesi: String(initial.kritikStokSeviyesi ?? "5"),
              garantiSuresi: String(initial.garantiSuresi ?? "0"),
              tedarikci: initial.tedarikci || "",
            }
          : EMPTY_PRODUCT,
      );
    }
  }, [isOpen, initial]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ad.trim()) {
      toast.error("Ürün adı zorunludur");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        alisFiyati: Number(form.alisFiyati) || 0,
        satisFiyati: Number(form.satisFiyati) || 0,
        mevcutStok: Number(form.mevcutStok) || 0,
        kritikStokSeviyesi: Number(form.kritikStokSeviyesi) ?? 5,
        garantiSuresi: Number(form.garantiSuresi) || 0,
        tedarikci: (form.tedarikci || "").trim(),
      });
      onClose();
    } catch {
      // hata toast'ı servis katmanında fırlatılıyor
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="Ürün Adı"
              id="pf-ad"
              value={form.ad}
              onChange={set("ad")}
              required
            />
          </div>
          <Field label="Kategori" id="pf-kategori" value={form.kategori} onChange={set("kategori")} />
          <Field label="Barkod / SKU" id="pf-barkod" value={form.barkod} onChange={set("barkod")} />
          <Field label="Seri No" id="pf-seriNo" value={form.seriNo} onChange={set("seriNo")} />
          <Field
            label="Alış Fiyatı (₺)"
            id="pf-alis"
            type="number"
            min="0"
            step="0.01"
            value={form.alisFiyati}
            onChange={set("alisFiyati")}
          />
          <Field
            label="Satış Fiyatı (₺)"
            id="pf-satis"
            type="number"
            min="0"
            step="0.01"
            value={form.satisFiyati}
            onChange={set("satisFiyati")}
          />
          <Field
            label="Mevcut Stok"
            id="pf-stok"
            type="number"
            min="0"
            step="1"
            value={form.mevcutStok}
            onChange={set("mevcutStok")}
          />
          <Field
            label="Kritik Stok Seviyesi"
            id="pf-kritik"
            type="number"
            min="0"
            step="1"
            value={form.kritikStokSeviyesi}
            onChange={set("kritikStokSeviyesi")}
          />
          <Field
            label="Garanti Süresi (Ay)"
            id="pf-garanti"
            type="number"
            min="0"
            step="1"
            value={form.garantiSuresi}
            onChange={set("garantiSuresi")}
          />
          <Field
            label="Tedarikçi"
            id="pf-tedarikci"
            value={form.tedarikci}
            onChange={set("tedarikci")}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-container text-white px-5 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Stok Hareketi Modalı ─────────────────────────────────────────────────────
function MovementModal({ isOpen, onClose, product, onSave }) {
  const [form, setForm] = useState({ hareketTipi: "Giriş", miktar: "1", aciklama: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setForm({ hareketTipi: "Giriş", miktar: "1", aciklama: "" });
  }, [isOpen]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const miktar = Number(form.miktar);
    if (!miktar || miktar < 1) {
      toast.error("Miktar en az 1 olmalıdır");
      return;
    }
    setSaving(true);
    try {
      await onSave({ productId: product._id || product.id, ...form, miktar });
      onClose();
    } catch {
      // hata toast servis katmanında
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stok Hareketi Ekle" width="max-w-md">
      {product && (
        <p className="text-xs text-on-surface-variant mb-4 bg-surface-container rounded-lg px-3 py-2">
          <span className="font-bold text-on-surface">{product.ad}</span>
          {" · "}Mevcut Stok:{" "}
          <span className="font-bold text-on-surface">{product.mevcutStok}</span>
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="mv-tip" className="text-xs font-semibold text-on-surface-variant">
            Hareket Tipi <span className="text-red-500">*</span>
          </label>
          <select
            id="mv-tip"
            value={form.hareketTipi}
            onChange={set("hareketTipi")}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Miktar"
          id="mv-miktar"
          type="number"
          min="1"
          step="1"
          value={form.miktar}
          onChange={set("miktar")}
          required
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="mv-aciklama" className="text-xs font-semibold text-on-surface-variant">
            Açıklama (opsiyonel)
          </label>
          <textarea
            id="mv-aciklama"
            rows={2}
            value={form.aciklama}
            onChange={set("aciklama")}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-container text-white px-5 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Stok Geçmişi Modalı ──────────────────────────────────────────────────────
function HistoryModal({ isOpen, onClose, product, movements, onCancel }) {
  const productMovements = movements.filter(
    (m) => String(m.productId?._id || m.productId) === String(product?._id || product?.id),
  );

  const hareketColor = {
    Giriş: "text-green-700 bg-green-50 border-green-200",
    Çıkış: "text-red-700 bg-red-50 border-red-200",
    Transfer: "text-blue-700 bg-blue-50 border-blue-200",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Stok Hareketleri — ${product?.ad || ""}`}
      width="max-w-2xl"
    >
      {productMovements.length === 0 ? (
        <p className="text-sm text-center text-on-surface-variant py-8">
          Bu ürüne ait hareket kaydı bulunamadı.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {productMovements.map((m) => {
            const performedName = m.performedBy
              ? `${m.performedBy.ad || ""} ${m.performedBy.soyad || ""}`.trim()
              : "–";
            return (
              <div
                key={m._id}
                className="flex items-start justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${hareketColor[m.hareketTipi] || ""}`}
                    >
                      {m.hareketTipi}
                    </span>
                    <span className="text-sm font-semibold text-on-surface">
                      {m.miktar} adet
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {m.oncekiStok} → {m.sonrakiStok}
                    </span>
                  </div>
                  {m.aciklama && (
                    <p className="text-xs text-on-surface-variant truncate">{m.aciklama}</p>
                  )}
                  <p className="text-xs text-on-surface-variant">
                    {formatDate(m.createdAt)} · <span className="font-medium">{performedName}</span>
                  </p>
                </div>
                <button
                  onClick={() => onCancel(m._id)}
                  title="Bu hareketi geri al"
                  className="flex-shrink-0 rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Undo2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function StockManagementPage({ canManageStock = false }) {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Modal states
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [movementProduct, setMovementProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);

  // ─── Veri Yükleme ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, movs] = await Promise.all([getProducts(), getStockMovements()]);
      setProducts(prods || []);
      setMovements(movs || []);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Filtreler ──────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.kategori).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.ad.toLowerCase().includes(q) ||
        (p.barkod || "").toLowerCase().includes(q) ||
        (p.kategori || "").toLowerCase().includes(q);
      const matchCat = categoryFilter === "all" || p.kategori === categoryFilter;
      const matchCritical = !criticalOnly || p.mevcutStok <= p.kritikStokSeviyesi;
      return matchSearch && matchCat && matchCritical;
    });
  }, [products, search, categoryFilter, criticalOnly]);

  const criticalCount = useMemo(
    () => products.filter((p) => p.mevcutStok <= p.kritikStokSeviyesi).length,
    [products],
  );

  // ─── CRUD ───────────────────────────────────────────────────────────────────
  const handleSaveProduct = useCallback(
    async (data) => {
      if (editingProduct) {
        await updateProduct(editingProduct._id || editingProduct.id, data);
        toast.success("Ürün güncellendi");
      } else {
        await createProduct(data);
        toast.success("Ürün oluşturuldu");
      }
      setEditingProduct(null);
      await loadAll();
    },
    [editingProduct, loadAll],
  );

  const handleDeleteProduct = useCallback(
    async (product) => {
      if (!window.confirm(`"${product.ad}" ürününü silmek istiyor musunuz?`)) return;
      try {
        await deleteProduct(product._id || product.id);
        toast.success("Ürün silindi");
        await loadAll();
      } catch {
        // hata toast servis katmanında
      }
    },
    [loadAll],
  );

  const handleSaveMovement = useCallback(
    async (data) => {
      await addStockMovement(data);
      toast.success("Stok hareketi kaydedildi");
      await loadAll();
    },
    [loadAll],
  );

  const handleCancelMovement = useCallback(
    async (movementId) => {
      if (!window.confirm("Bu hareketi geri almak istediğinizden emin misiniz?")) return;
      try {
        await cancelStockMovement(movementId);
        toast.success("Stok hareketi iptal edildi");
        await loadAll();
      } catch {
        // hata toast servis katmanında
      }
    },
    [loadAll],
  );

  // ─── Excel Dışa Aktarma ─────────────────────────────────────────────────────
  const handleExcelExport = useCallback(() => {
    const rows = filtered.map((p) => ({
      "Ürün Adı": p.ad,
      Kategori: p.kategori || "",
      Barkod: p.barkod || "",
      "Seri No": p.seriNo || "",
      "Alış Fiyatı (₺)": Number(p.alisFiyati || 0),
      "Satış Fiyatı (₺)": Number(p.satisFiyati || 0),
      "Mevcut Stok": Number(p.mevcutStok || 0),
      "Kritik Stok Seviyesi": Number(p.kritikStokSeviyesi || 0),
      Durum: p.mevcutStok <= p.kritikStokSeviyesi ? "⚠ KRİTİK" : "Normal",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok");

    // Sütun genişlikleri
    ws["!cols"] = [
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 16 }, { wch: 16 }, { wch: 13 }, { wch: 20 }, { wch: 10 },
    ];

    const today = new Date().toLocaleDateString("tr-TR").replace(/\//g, "-");
    XLSX.writeFile(wb, `Stok_Raporu_${today}.xlsx`);
    toast.success("Excel dosyası indirildi");
  }, [filtered]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2
            className="text-2xl font-semibold text-on-surface"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Ürün & Stok Yönetimi
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {products.length} ürün
            {criticalCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-600 font-semibold">
                <AlertTriangle size={12} />
                {criticalCount} kritik
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExcelExport}
            className="flex items-center gap-2 text-sm font-semibold border border-outline-variant rounded-lg px-4 py-2 hover:bg-surface-container transition-colors cursor-pointer text-on-surface"
            title="Tabloyu Excel olarak indir"
          >
            <Download size={16} />
            Excel İndir
          </button>

          {canManageStock && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowProductForm(true);
              }}
              className="flex items-center gap-2 text-sm font-semibold bg-primary-container text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <PlusCircle size={16} />
              Yeni Ürün
            </button>
          )}
        </div>
      </div>

      {/* Kritik stok uyarısı */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{criticalCount}</strong> ürün kritik stok seviyesinin altında veya ona eşit.
          </span>
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface flex flex-col sm:flex-row gap-3">
          {/* Arama */}
          <div className="relative grow">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün adı, barkod veya kategori ile ara..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
            />
          </div>

          {/* Kategori */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 focus:outline-none focus:border-primary-container cursor-pointer text-on-surface"
              aria-label="Kategori filtresi"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Kritik filtre */}
          <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={criticalOnly}
              onChange={(e) => setCriticalOnly(e.target.checked)}
              className="accent-primary-container w-4 h-4"
            />
            Yalnızca kritik
          </label>
        </div>

        {/* Tablo */}
        <div className="overflow-x-auto">
          {loading ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">
              {products.length === 0 ? "Henüz ürün kaydı yok." : "Arama kriterine uygun ürün bulunamadı."}
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-variant border-b border-outline-variant">
                  {[
                    "Ürün Adı",
                    "Kategori",
                    "Barkod",
                    "Alış",
                    "Satış",
                    "Mevcut Stok",
                    "Kritik Seviye",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="p-4 text-xs font-semibold text-on-surface-variant whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const isCritical = product.mevcutStok <= product.kritikStokSeviyesi;
                  const id = product._id || product.id;

                  return (
                    <tr
                      key={id}
                      className={`border-b border-outline-variant transition-colors ${
                        isCritical
                          ? "bg-red-50 hover:bg-red-100"
                          : "hover:bg-surface-container"
                      }`}
                    >
                      {/* Ürün Adı */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isCritical && (
                            <AlertTriangle
                              size={14}
                              className="shrink-0 text-red-500"
                              title="Kritik stok"
                            />
                          )}
                          <span
                            className={`text-sm font-semibold ${isCritical ? "text-red-700" : "text-on-surface"}`}
                          >
                            {product.ad}
                          </span>
                        </div>
                        {product.seriNo && (
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            S/N: {product.seriNo}
                          </p>
                        )}
                      </td>

                      {/* Kategori */}
                      <td className="p-4">
                        {product.kategori ? (
                          <span className="inline-flex rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface">
                            {product.kategori}
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">–</span>
                        )}
                      </td>

                      {/* Barkod */}
                      <td className="p-4 text-sm text-on-surface-variant font-mono">
                        {product.barkod || "–"}
                      </td>

                      {/* Alış */}
                      <td className="p-4 text-sm text-on-surface">
                        {formatCurrency(product.alisFiyati)}
                      </td>

                      {/* Satış */}
                      <td className="p-4 text-sm text-on-surface">
                        {formatCurrency(product.satisFiyati)}
                      </td>

                      {/* Mevcut Stok */}
                      <td className="p-4">
                        <span
                          className={`text-sm font-bold ${
                            isCritical ? "text-red-600" : "text-on-surface"
                          }`}
                        >
                          {Number(product.mevcutStok || 0).toLocaleString("tr-TR")}
                        </span>
                      </td>

                      {/* Kritik Seviye */}
                      <td className="p-4 text-sm text-on-surface-variant">
                        {Number(product.kritikStokSeviyesi || 0).toLocaleString("tr-TR")}
                      </td>

                      {/* Aksiyonlar */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stok geçmişi */}
                          <button
                            onClick={() => setHistoryProduct(product)}
                            title="Stok geçmişi"
                            className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                          >
                            <History size={15} />
                          </button>

                          {canManageStock && (
                            <>
                              {/* Hareket ekle */}
                              <button
                                onClick={() => setMovementProduct(product)}
                                title="Stok hareketi ekle"
                                className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                              >
                                <PackagePlus size={15} />
                              </button>

                              {/* Düzenle */}
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setShowProductForm(true);
                                }}
                                title="Ürünü düzenle"
                                className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                              >
                                <Pencil size={15} />
                              </button>

                              {/* Sil */}
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                title="Ürünü sil"
                                className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Modallar ─────────────────────────────────────────────────────── */}
      <ProductFormModal
        isOpen={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        initial={editingProduct}
      />

      {movementProduct && (
        <MovementModal
          isOpen={!!movementProduct}
          onClose={() => setMovementProduct(null)}
          product={movementProduct}
          onSave={handleSaveMovement}
        />
      )}

      {historyProduct && (
        <HistoryModal
          isOpen={!!historyProduct}
          onClose={() => setHistoryProduct(null)}
          product={historyProduct}
          movements={movements}
          onCancel={handleCancelMovement}
        />
      )}
    </div>
  );
}
