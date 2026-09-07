import { useEffect, useState } from "react";
import { Search, PlusCircle } from "lucide-react";
import { toast } from "react-toastify";
import { markalar } from "../data/stockData";
import AddStockModal from "../components/modals/AddStockModal";

const selectClass =
  "text-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 text-on-surface cursor-pointer";

export default function StockPage({
  stock = [],
  onAddStock,
  onUpdateStockQuantity,
  isLoading = false,
  errorMessage = "",
  isSubmitting = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [draftQuantities, setDraftQuantities] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftQuantities(
      stock.reduce((acc, item) => {
        const itemId = item._id || item.id;
        acc[itemId] = String(Number(item.adet || 0));
        return acc;
      }, {}),
    );
  }, [stock]);

  const handleAddStock = async (payload) => {
    try {
      await onAddStock(payload);
      setShowAddModal(false);
    } catch (error) {
      console.error("Hata Detayı:", error);
    }
  };

  const filteredStock = stock.filter((item) => {
    const matchesSearch = item.urunKodu
      .toLowerCase()
      .includes(searchQuery.toLowerCase().trim());
    const matchesBrand = brandFilter === "all" || item.marka === brandFilter;
    return matchesSearch && matchesBrand;
  });

  const getItemId = (item) => item._id || item.id;

  const getMinimumQuantity = (item) => Number(item.envanterdekiAdet || 0);

  const getNormalizedDraftQuantity = (item) => {
    const itemId = getItemId(item);
    const rawValue = draftQuantities[itemId];

    if (rawValue === "") {
      return getMinimumQuantity(item);
    }

    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return Number(item.adet || 0);
    }

    return Math.max(getMinimumQuantity(item), Math.round(parsedValue));
  };

  const hasPendingChange = (item) =>
    getNormalizedDraftQuantity(item) !== Number(item.adet || 0);

  const pendingChangesCount = filteredStock.filter(hasPendingChange).length;

  const handleDraftQuantityChange = (item, value) => {
    const itemId = getItemId(item);

    if (value === "") {
      setDraftQuantities((prev) => ({ ...prev, [itemId]: "" }));
      return;
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setDraftQuantities((prev) => ({
      ...prev,
      [itemId]: String(Math.max(0, Math.round(parsedValue))),
    }));
  };

  const adjustDraftQuantity = (item, delta) => {
    const itemId = getItemId(item);
    const nextQuantity = Math.max(
      getMinimumQuantity(item),
      getNormalizedDraftQuantity(item) + delta,
    );

    setDraftQuantities((prev) => ({
      ...prev,
      [itemId]: String(nextQuantity),
    }));
  };

  const handleSaveAllChanges = async () => {
    const changedItems = filteredStock.filter(hasPendingChange);
    if (changedItems.length === 0) return;

    setIsSaving(true);

    try {
      const updatePromises = changedItems.map(async (item) => {
        const itemId = getItemId(item);
        const nextQuantity = getNormalizedDraftQuantity(item);
        await onUpdateStockQuantity?.(itemId, nextQuantity);
        return { itemId, nextQuantity };
      });

      const results = await Promise.all(updatePromises);

      setDraftQuantities((prev) => {
        const updated = { ...prev };
        results.forEach(({ itemId, nextQuantity }) => {
          updated[itemId] = String(nextQuantity);
        });
        return updated;
      });

      toast.success(`${results.length} stok kalemi başarıyla güncellendi`);
    } catch (error) {
      console.error("Stok güncelleme hatası:", error);
      toast.error("Stok güncellenirken bir hata oluştu");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2
          className="text-2xl font-semibold text-on-surface"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          Stok (Envanter)
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAllChanges}
            disabled={pendingChangesCount === 0 || isSubmitting || isSaving}
            className={`text-sm font-semibold rounded-lg px-5 py-2.5 flex items-center justify-center gap-2 active:scale-95 shrink-0 cursor-pointer transition-opacity ${
              pendingChangesCount === 0
                ? "bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60"
                : "bg-primary-container text-white hover:opacity-90"
            }`}
          >
            {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm font-semibold bg-primary-container text-white hover:opacity-90 transition-opacity rounded-lg px-5 py-2.5 flex items-center justify-center gap-2 active:scale-95 shrink-0 cursor-pointer"
          >
            <PlusCircle size={18} />
            Yeni Stok Ekle
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {pendingChangesCount > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Kaydedilmeyi bekleyen {pendingChangesCount} stok satırı var.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-6 text-sm text-on-surface-variant">
          Yükleniyor...
        </div>
      ) : null}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface flex flex-col sm:flex-row gap-3">
          <div className="relative grow">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün Kodu ile ara..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/30 transition-all"
            />
          </div>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className={selectClass}
            aria-label="Marka filtresi"
          >
            <option value="all">Tüm Markalar</option>
            {markalar.map((marka) => (
              <option key={marka} value={marka}>
                {marka}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          {filteredStock.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-12">
              {stock.length === 0
                ? "Henüz stok kaydı yok"
                : "Arama veya filtreye uygun ürün bulunamadı"}
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-variant border-b border-outline-variant">
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Ürün Kodu
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Marka
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant text-right">
                    Toplam Adet
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant text-right">
                    Envanterde
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant text-right">
                    Adet Değiştir
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item) => {
                  const itemId = getItemId(item);
                  const minimumQuantity = getMinimumQuantity(item);
                  const draftQuantity =
                    draftQuantities[itemId] ?? String(Number(item.adet || 0));
                  const normalizedDraftQuantity = getNormalizedDraftQuantity(item);

                  return (
                    <tr
                      key={itemId}
                      className="border-b border-outline-variant hover:bg-surface-container transition-colors"
                    >
                      <td className="p-4 text-sm font-medium text-on-surface">
                        {item.urunKodu}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface">
                          {item.marka}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-semibold text-on-surface">
                          {Number(item.adet || 0).toLocaleString("tr-TR")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-medium text-on-surface-variant">
                          {Number(item.envanterdekiAdet || 0).toLocaleString("tr-TR")}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => adjustDraftQuantity(item, -1)}
                            disabled={isSubmitting || normalizedDraftQuantity <= minimumQuantity}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            aria-label={`${item.urunKodu} adet azalt`}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={minimumQuantity}
                            step="1"
                            value={draftQuantity}
                            onChange={(event) =>
                              handleDraftQuantityChange(item, event.target.value)
                            }
                            onBlur={() =>
                              setDraftQuantities((prev) => ({
                                ...prev,
                                [itemId]: String(getNormalizedDraftQuantity(item)),
                              }))
                            }
                            className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-right text-sm font-semibold text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/30"
                            aria-label={`${item.urunKodu} stok adedi`}
                          />
                          <button
                            type="button"
                            onClick={() => adjustDraftQuantity(item, 1)}
                            disabled={isSubmitting}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            aria-label={`${item.urunKodu} adet artır`}
                          >
                            +
                          </button>
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

      <AddStockModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddStock}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
