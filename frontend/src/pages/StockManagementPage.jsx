import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  Download,
  History,
  PackagePlus,
  Pencil,
  Plus,
  PlusCircle,
  Search,
  Tag,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
  addBrand,
  addCategory,
  addStockMovement,
  cancelStockMovement,
  createProduct,
  deleteProduct,
  getBrands,
  getCategories,
  getProducts,
  getStockMovements,
  updateProduct,
} from "../services/productService";
import { DEFAULT_BRANDS, DEFAULT_CATEGORIES } from "../utils/localDb";

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
  urunKodu: "",
  marka: "Bosch",
  kategori: "Buzdolabı",
  barkod: "",
  seriNo: "",
  alisFiyati: "",
  satisFiyati: "",
  mevcutStok: "",
  kritikStokSeviyesi: "5",
  garantiSuresi: "24",
  tedarikci: "",
};

const MOVEMENT_TYPES = ["Giriş", "Çıkış", "Transfer"];
const NEW_OPTION_VALUE = "__ADD_NEW__";

// ─── Alt Bileşenler ───────────────────────────────────────────────────────────

/** Giriş alanı */
function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  min,
  step,
  placeholder,
  required,
}) {
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
        placeholder={placeholder}
        className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
      />
    </div>
  );
}

/** Modal çerçevesi */
function Modal({ isOpen, onClose, title, children, width = "max-w-xl" }) {
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
            type="button"
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

/**
 * Açılır Liste + "+ Yeni Marka/Kategori Ekle" Bileşeni
 */
function SelectWithCustomAdd({
  id,
  label,
  value,
  options,
  onChange,
  onAddNewOption,
  addButtonLabel,
  placeholderNew,
  required = false,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const handleSelectChange = (e) => {
    const selected = e.target.value;
    if (selected === NEW_OPTION_VALUE) {
      setIsAdding(true);
      setNewItemText("");
      return;
    }
    onChange(selected);
  };

  const handleSaveNewItem = async () => {
    const trimmed = newItemText.trim();
    if (!trimmed) {
      toast.warning("Lütfen eklenecek adı yazınız.");
      return;
    }
    setIsSubmittingNew(true);
    try {
      await onAddNewOption(trimmed);
      onChange(trimmed);
      setIsAdding(false);
      setNewItemText("");
    } catch {
      // hata toast servis katmanında
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-on-surface-variant">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setNewItemText("");
            }}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-container hover:underline cursor-pointer"
          >
            <Plus size={12} />
            {addButtonLabel}
          </button>
        )}
      </div>

      <select
        id={id}
        value={options.includes(value) ? value : options[0] || ""}
        onChange={handleSelectChange}
        className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={NEW_OPTION_VALUE} className="font-semibold text-blue-700">
          + {addButtonLabel}
        </option>
      </select>

      {isAdding && (
        <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-primary-container/40 bg-primary-container/5 p-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveNewItem();
              }
            }}
            placeholder={placeholderNew}
            autoFocus
            className="flex-1 min-w-0 rounded border border-outline-variant bg-white px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container"
          />
          <button
            type="button"
            disabled={isSubmittingNew}
            onClick={handleSaveNewItem}
            className="inline-flex items-center gap-1 rounded bg-primary-container px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 cursor-pointer disabled:opacity-60"
          >
            <Check size={13} />
            Ekle
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewItemText("");
            }}
            className="rounded border border-outline-variant bg-white p-1.5 text-on-surface-variant hover:bg-surface-container cursor-pointer"
            title="İptal"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Ürün Formu Modalı ────────────────────────────────────────────────────────
function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  initial = null,
  brands = DEFAULT_BRANDS,
  categories = DEFAULT_CATEGORIES,
  onAddBrand,
  onAddCategory,
}) {
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        initial
          ? {
              ad: initial.ad || "",
              urunKodu: initial.urunKodu || initial.barkod || "",
              marka: initial.marka || brands[0] || "Bosch",
              kategori: initial.kategori || categories[0] || "Buzdolabı",
              barkod: initial.barkod || initial.urunKodu || "",
              seriNo: initial.seriNo || "",
              alisFiyati: String(initial.alisFiyati ?? ""),
              satisFiyati: String(initial.satisFiyati ?? ""),
              mevcutStok: String(initial.mevcutStok ?? ""),
              kritikStokSeviyesi: String(initial.kritikStokSeviyesi ?? "5"),
              garantiSuresi: String(initial.garantiSuresi ?? "24"),
              tedarikci: initial.tedarikci || "",
            }
          : {
              ...EMPTY_PRODUCT,
              marka: brands[0] || "Bosch",
              kategori: categories[0] || "Buzdolabı",
            },
      );
    }
  }, [isOpen, initial, brands, categories]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ad.trim()) {
      toast.error("Ürün adı zorunludur");
      return;
    }
    if (!form.marka.trim()) {
      toast.error("Lütfen bir marka seçiniz");
      return;
    }
    if (!form.kategori.trim()) {
      toast.error("Lütfen bir kategori seçiniz");
      return;
    }

    const cleanCode = (form.urunKodu || form.barkod || "").trim();
    const cleanBarcode = (form.barkod || form.urunKodu || "").trim();

    setSaving(true);
    try {
      await onSave({
        ...form,
        ad: form.ad.trim(),
        urunKodu: cleanCode,
        barkod: cleanBarcode,
        marka: form.marka.trim(),
        kategori: form.kategori.trim(),
        alisFiyati: Number(form.alisFiyati) || 0,
        satisFiyati: Number(form.satisFiyati) || 0,
        mevcutStok: Number(form.mevcutStok) || 0,
        kritikStokSeviyesi:
          form.kritikStokSeviyesi !== "" ? Number(form.kritikStokSeviyesi) : 5,
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
      width="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="Ürün Adı"
              id="pf-ad"
              value={form.ad}
              onChange={set("ad")}
              placeholder="Örn: Bosch Serie 4 No Frost Buzdolabı"
              required
            />
          </div>

          {/* Marka Seçimi (Select + Yeni Marka Ekle) */}
          <SelectWithCustomAdd
            id="pf-marka"
            label="Marka"
            required
            value={form.marka}
            options={brands}
            onChange={(val) => setForm((prev) => ({ ...prev, marka: val }))}
            onAddNewOption={onAddBrand}
            addButtonLabel="Yeni Marka Ekle"
            placeholderNew="Yeni marka adı yazın..."
          />

          {/* Kategori Seçimi (Select + Yeni Kategori Ekle) */}
          <SelectWithCustomAdd
            id="pf-kategori"
            label="Kategori"
            required
            value={form.kategori}
            options={categories}
            onChange={(val) => setForm((prev) => ({ ...prev, kategori: val }))}
            onAddNewOption={onAddCategory}
            addButtonLabel="Yeni Kategori Ekle"
            placeholderNew="Yeni kategori adı yazın..."
          />

          <Field
            label="Ürün Kodu (Model / SKU)"
            id="pf-urunKodu"
            value={form.urunKodu}
            onChange={set("urunKodu")}
            placeholder="Örn: KGN86AI42N"
          />

          <Field
            label="Barkod"
            id="pf-barkod"
            value={form.barkod}
            onChange={set("barkod")}
            placeholder="Örn: 4242005100137"
          />

          <Field
            label="Alış Fiyatı (₺)"
            id="pf-alis"
            type="number"
            min="0"
            step="0.01"
            value={form.alisFiyati}
            onChange={set("alisFiyati")}
            placeholder="0.00"
            required
          />

          <Field
            label="Satış Fiyatı (₺)"
            id="pf-satis"
            type="number"
            min="0"
            step="0.01"
            value={form.satisFiyati}
            onChange={set("satisFiyati")}
            placeholder="0.00"
            required
          />

          <Field
            label="Mevcut Stok Adedi"
            id="pf-stok"
            type="number"
            min="0"
            step="1"
            value={form.mevcutStok}
            onChange={set("mevcutStok")}
            placeholder="0"
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
            label="Seri No"
            id="pf-seriNo"
            value={form.seriNo}
            onChange={set("seriNo")}
            placeholder="Opsiyonel"
          />

          <div className="sm:col-span-2">
            <Field
              label="Tedarikçi"
              id="pf-tedarikci"
              value={form.tedarikci}
              onChange={set("tedarikci")}
              placeholder="Örn: BSH Ev Aletleri Sanayi ve Ticaret A.Ş."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
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
            {saving ? "Kaydediliyor..." : initial ? "Güncelle" : "Ürünü Kaydet"}
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
        <div className="text-xs text-on-surface-variant mb-4 bg-surface-container rounded-lg px-3.5 py-2.5 flex flex-col gap-0.5">
          <span className="font-bold text-on-surface text-sm">{product.ad}</span>
          <span>
            Marka: <strong className="text-on-surface">{product.marka || "–"}</strong>
            {" · "}Mevcut Stok:{" "}
            <strong className="text-on-surface">{product.mevcutStok} adet</strong>
          </span>
        </div>
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
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all cursor-pointer"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Miktar (Adet)"
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
            placeholder="Örn: Tedarikçi mal kabulü / Mağaza çıkışı..."
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
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
            {saving ? "Kaydediliyor..." : "Hareketi Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Stok Geçmişi Modalı ──────────────────────────────────────────────────────
function HistoryModal({ isOpen, onClose, product, movements, onCancel, canManageStock }) {
  const productMovements = useMemo(() => {
    if (!product) return [];
    const targetId = String(product._id || product.id);
    return movements.filter((m) => {
      const movProdId = String(m.productId?._id || m.productId || "");
      if (movProdId && movProdId === targetId) return true;
      if (product.urunKodu && m.urunKodu && m.urunKodu === product.urunKodu) return true;
      return false;
    });
  }, [movements, product]);

  const hareketColor = {
    Giriş: "text-green-700 bg-green-50 border-green-200",
    Çıkış: "text-red-700 bg-red-50 border-red-200",
    Transfer: "text-blue-700 bg-blue-50 border-blue-200",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Stok Geçmişi — ${product?.ad || ""}`}
      width="max-w-2xl"
    >
      {product && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-container px-3.5 py-2 text-xs text-on-surface-variant">
          <span>
            Kod: <strong className="text-on-surface">{product.urunKodu || product.barkod || "–"}</strong>
            {" · "}Marka: <strong className="text-on-surface">{product.marka || "–"}</strong>
          </span>
          <span>
            Güncel Stok: <strong className="text-on-surface">{product.mevcutStok} adet</strong>
          </span>
        </div>
      )}

      {productMovements.length === 0 ? (
        <p className="text-sm text-center text-on-surface-variant py-8">
          Bu ürüne ait stok hareket kaydı bulunamadı.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {productMovements.map((m) => {
            const performedName = m.performedBy
              ? `${m.performedBy.ad || ""} ${m.performedBy.soyad || ""}`.trim()
              : "–";
            return (
              <div
                key={m._id || m.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${
                        hareketColor[m.hareketTipi] || ""
                      }`}
                    >
                      {m.hareketTipi}
                    </span>
                    <span className="text-sm font-semibold text-on-surface">
                      {m.miktar} adet
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      ({m.oncekiStok} → {m.sonrakiStok})
                    </span>
                  </div>
                  {m.aciklama && (
                    <p className="text-xs text-on-surface-variant">{m.aciklama}</p>
                  )}
                  <p className="text-xs text-on-surface-variant">
                    {formatDate(m.createdAt)} ·{" "}
                    <span className="font-medium">{performedName || "Sistem"}</span>
                  </p>
                </div>
                {canManageStock && (
                  <button
                    type="button"
                    onClick={() => onCancel(m._id || m.id)}
                    title="Bu stok hareketini geri al"
                    className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <Undo2 size={14} />
                    Geri Al
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function StockManagementPage({ canManageStock = false, onStockChange }) {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [brands, setBrands] = useState(DEFAULT_BRANDS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  // Arama, Filtre ve Sıralama state'leri
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Modal state'leri
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [movementProduct, setMovementProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);

  // ─── Veri Yükleme ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, movs, brandList, categoryList] = await Promise.all([
        getProducts(),
        getStockMovements(),
        getBrands(),
        getCategories(),
      ]);
      setProducts(prods || []);
      setMovements(movs || []);
      if (Array.isArray(brandList) && brandList.length > 0) setBrands(brandList);
      if (Array.isArray(categoryList) && categoryList.length > 0) setCategories(categoryList);
    } catch {
      toast.error("Ürün ve stok verileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // historyProduct açıksa güncel ürün bilgisini senkron tut
  const activeHistoryProduct = useMemo(() => {
    if (!historyProduct) return null;
    const targetId = String(historyProduct._id || historyProduct.id);
    return (
      products.find((p) => String(p._id || p.id) === targetId) || historyProduct
    );
  }, [historyProduct, products]);

  // ─── Yeni Marka / Kategori Ekleme ───────────────────────────────────────────
  const handleAddBrand = useCallback(async (newBrandName) => {
    const updated = await addBrand(newBrandName);
    if (Array.isArray(updated)) setBrands(updated);
    toast.success(`"${newBrandName}" markası eklendi`);
  }, []);

  const handleAddCategory = useCallback(async (newCategoryName) => {
    const updated = await addCategory(newCategoryName);
    if (Array.isArray(updated)) setCategories(updated);
    toast.success(`"${newCategoryName}" kategorisi eklendi`);
  }, []);

  // ─── Filtreleme ve Sıralama ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLocaleLowerCase("tr-TR").trim();

    const matched = products.filter((p) => {
      const matchSearch =
        !q ||
        (p.ad || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (p.urunKodu || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (p.barkod || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (p.marka || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (p.kategori || "").toLocaleLowerCase("tr-TR").includes(q);
      const matchCat = categoryFilter === "all" || p.kategori === categoryFilter;
      const matchBrand = brandFilter === "all" || p.marka === brandFilter;
      const matchCritical =
        !criticalOnly || Number(p.mevcutStok || 0) <= Number(p.kritikStokSeviyesi ?? 5);
      return matchSearch && matchCat && matchBrand && matchCritical;
    });

    const sorted = [...matched];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => Number(a.satisFiyati || 0) - Number(b.satisFiyati || 0));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => Number(b.satisFiyati || 0) - Number(a.satisFiyati || 0));
    } else if (sortBy === "stock_asc") {
      sorted.sort((a, b) => Number(a.mevcutStok || 0) - Number(b.mevcutStok || 0));
    } else if (sortBy === "stock_desc") {
      sorted.sort((a, b) => Number(b.mevcutStok || 0) - Number(a.mevcutStok || 0));
    }

    return sorted;
  }, [products, search, categoryFilter, brandFilter, sortBy, criticalOnly]);

  const criticalCount = useMemo(
    () =>
      products.filter(
        (p) => Number(p.mevcutStok || 0) <= Number(p.kritikStokSeviyesi ?? 5),
      ).length,
    [products],
  );

  // ─── CRUD ───────────────────────────────────────────────────────────────────
  const handleSaveProduct = useCallback(
    async (data) => {
      if (editingProduct) {
        await updateProduct(editingProduct._id || editingProduct.id, data);
        toast.success("Ürün bilgileri güncellendi");
      } else {
        await createProduct(data);
        toast.success("Yeni ürün oluşturuldu");
      }
      setEditingProduct(null);
      await loadAll();
      await onStockChange?.();
    },
    [editingProduct, loadAll, onStockChange],
  );

  const handleDeleteProduct = useCallback(
    async (product) => {
      if (!window.confirm(`"${product.ad}" ürününü silmek istiyor musunuz?`)) return;
      try {
        await deleteProduct(product._id || product.id);
        toast.success("Ürün silindi");
        await loadAll();
        await onStockChange?.();
      } catch {
        // hata toast servis katmanında
      }
    },
    [loadAll, onStockChange],
  );

  const handleSaveMovement = useCallback(
    async (data) => {
      await addStockMovement(data);
      toast.success("Stok hareketi kaydedildi");
      await loadAll();
      await onStockChange?.();
    },
    [loadAll, onStockChange],
  );

  const handleCancelMovement = useCallback(
    async (movementId) => {
      if (!window.confirm("Bu hareketi geri almak istediğinizden emin misiniz?")) return;
      try {
        await cancelStockMovement(movementId);
        toast.success("Stok hareketi iptal edildi");
        await loadAll();
        await onStockChange?.();
      } catch {
        // hata toast servis katmanında
      }
    },
    [loadAll, onStockChange],
  );

  // ─── Excel Dışa Aktarma ─────────────────────────────────────────────────────
  const handleExcelExport = useCallback(() => {
    const rows = filtered.map((p) => ({
      "Ürün Adı": p.ad,
      "Ürün Kodu": p.urunKodu || "",
      Barkod: p.barkod || "",
      Marka: p.marka || "",
      Kategori: p.kategori || "",
      "Seri No": p.seriNo || "",
      "Alış Fiyatı (₺)": Number(p.alisFiyati || 0),
      "Satış Fiyatı (₺)": Number(p.satisFiyati || 0),
      "Mevcut Stok": Number(p.mevcutStok || 0),
      "Kritik Stok Seviyesi": Number(p.kritikStokSeviyesi || 0),
      Durum:
        Number(p.mevcutStok || 0) <= Number(p.kritikStokSeviyesi ?? 5)
          ? "⚠ KRİTİK"
          : "Normal",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok");

    ws["!cols"] = [
      { wch: 34 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 13 },
      { wch: 18 },
      { wch: 12 },
    ];

    const today = new Date().toLocaleDateString("tr-TR").replace(/\//g, "-");
    XLSX.writeFile(wb, `Urun_Stok_Raporu_${today}.xlsx`);
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
            Toplam <strong>{products.length}</strong> ürün
            {filtered.length !== products.length && (
              <span> · Gösterilen: <strong>{filtered.length}</strong></span>
            )}
            {criticalCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-600 font-semibold">
                <AlertTriangle size={12} />
                {criticalCount} kritik stok
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExcelExport}
            className="flex items-center gap-2 text-sm font-semibold border border-outline-variant rounded-lg px-4 py-2 hover:bg-surface-container transition-colors cursor-pointer text-on-surface"
            title="Tabloyu Excel olarak indir"
          >
            <Download size={16} />
            Excel İndir
          </button>

          {canManageStock && (
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setShowProductForm(true);
              }}
              className="flex items-center gap-2 text-sm font-semibold bg-primary-container text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <PlusCircle size={16} />
              Yeni Ürün Ekle
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

      {/* Arama Çubuğu, Kategori/Marka Filtreleri ve Sıralama */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface flex flex-col lg:flex-row gap-3 lg:items-center">
          {/* Arama */}
          <div className="relative grow min-w-[220px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün adı, ürün kodu, barkod, marka veya kategori ile ara..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Kategori Filtresi */}
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

            {/* Marka Filtresi */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="text-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 focus:outline-none focus:border-primary-container cursor-pointer text-on-surface"
              aria-label="Marka filtresi"
            >
              <option value="all">Tüm Markalar</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Sıralama (Sort) */}
            <div className="relative flex items-center">
              <ArrowUpDown
                size={14}
                className="absolute left-3 text-on-surface-variant pointer-events-none"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm bg-surface-container-lowest border border-outline-variant rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-primary-container cursor-pointer text-on-surface"
                aria-label="Sıralama seçimi"
              >
                <option value="default">Sıralama: Varsayılan</option>
                <option value="price_asc">Fiyata Göre (Artan ↑)</option>
                <option value="price_desc">Fiyata Göre (Azalan ↓)</option>
                <option value="stock_asc">Stok Miktarına Göre (Artan ↑)</option>
                <option value="stock_desc">Stok Miktarına Göre (Azalan ↓)</option>
              </select>
            </div>

            {/* Kritik filtre */}
            <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none whitespace-nowrap px-1">
              <input
                type="checkbox"
                checked={criticalOnly}
                onChange={(e) => setCriticalOnly(e.target.checked)}
                className="accent-primary-container w-4 h-4"
              />
              Yalnızca kritik
            </label>
          </div>
        </div>

        {/* Tablo */}
        <div className="overflow-x-auto">
          {loading ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-on-surface-variant">
              {products.length === 0
                ? "Henüz ürün kaydı yok."
                : "Arama veya filtre kriterlerine uygun ürün bulunamadı."}
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-variant border-b border-outline-variant">
                  {[
                    "Ürün Adı",
                    "Barkod / Kod",
                    "Marka",
                    "Kategori",
                    "Alış Fiyatı",
                    "Satış Fiyatı",
                    "Mevcut Stok",
                    "Kritik Seviye",
                    "İşlemler",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`p-4 text-xs font-semibold text-on-surface-variant whitespace-nowrap ${
                        i === 8 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const isCritical =
                    Number(product.mevcutStok || 0) <= Number(product.kritikStokSeviyesi ?? 5);
                  const id = product._id || product.id;

                  return (
                    <tr
                      key={id}
                      className={`border-b border-outline-variant transition-colors ${
                        isCritical
                          ? "bg-red-50/70 hover:bg-red-100/80"
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
                            className={`text-sm font-semibold ${
                              isCritical ? "text-red-700" : "text-on-surface"
                            }`}
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

                      {/* Barkod / Ürün Kodu */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-on-surface font-mono">
                            {product.urunKodu || product.barkod || "–"}
                          </span>
                          {product.barkod &&
                            product.urunKodu &&
                            product.barkod !== product.urunKodu && (
                              <span className="text-[11px] text-on-surface-variant font-mono">
                                {product.barkod}
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Marka */}
                      <td className="p-4">
                        {product.marka ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/10 border border-primary-container/20 px-2.5 py-1 text-xs font-semibold text-primary-container">
                            <Tag size={11} />
                            {product.marka}
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant">–</span>
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

                      {/* Alış Fiyatı */}
                      <td className="p-4 text-sm text-on-surface-variant font-medium whitespace-nowrap">
                        {formatCurrency(product.alisFiyati)}
                      </td>

                      {/* Satış Fiyatı */}
                      <td className="p-4 text-sm font-semibold text-on-surface whitespace-nowrap">
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
                        {Number(product.kritikStokSeviyesi ?? 5).toLocaleString("tr-TR")}
                      </td>

                      {/* Aksiyonlar */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stok Hareketi Ekle (Kutu İkonu) */}
                          {canManageStock && (
                            <button
                              type="button"
                              onClick={() => setMovementProduct(product)}
                              title="Stok hareketi ekle (Giriş / Çıkış)"
                              className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary-container transition-colors cursor-pointer"
                            >
                              <PackagePlus size={15} />
                            </button>
                          )}

                          {/* Stok Geçmişi (Saat İkonu) */}
                          <button
                            type="button"
                            onClick={() => setHistoryProduct(product)}
                            title="Stok geçmişi"
                            className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary-container transition-colors cursor-pointer"
                          >
                            <History size={15} />
                          </button>

                          {canManageStock && (
                            <>
                              {/* Düzenle (Kalem İkonu) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setShowProductForm(true);
                                }}
                                title="Ürünü düzenle"
                                className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary-container transition-colors cursor-pointer"
                              >
                                <Pencil size={15} />
                              </button>

                              {/* Sil (Çöp Kutusu İkonu) */}
                              <button
                                type="button"
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
        brands={brands}
        categories={categories}
        onAddBrand={handleAddBrand}
        onAddCategory={handleAddCategory}
      />

      <MovementModal
        isOpen={Boolean(movementProduct)}
        onClose={() => setMovementProduct(null)}
        product={movementProduct}
        onSave={handleSaveMovement}
      />

      <HistoryModal
        isOpen={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
        product={activeHistoryProduct}
        movements={movements}
        onCancel={handleCancelMovement}
        canManageStock={canManageStock}
      />
    </div>
  );
}
