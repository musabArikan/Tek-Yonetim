import { useEffect, useMemo, useState } from "react";
import { Search, PackageCheck } from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../components/modals/Modal";
import { formatDate } from "../utils/formatters";
import {
  getPendingInventory,
  deliverInventoryItem,
} from "../services/inventoryService";

const normalizeInventoryItem = (item, transaction) => ({
  transactionId: transaction._id || transaction.id,
  productIndex: item.productIndex ?? 0,
  musteriId:
    transaction.musteriId && typeof transaction.musteriId === "object"
      ? transaction.musteriId._id || transaction.musteriId.id
      : transaction.musteriId,
  musteriAd:
    transaction.musteriId && typeof transaction.musteriId === "object"
      ? `${transaction.musteriId.ad || ""} ${transaction.musteriId.soyad || ""}`.trim()
      : "Bilinmeyen Müşteri",
  telefon:
    transaction.musteriId && typeof transaction.musteriId === "object"
      ? transaction.musteriId.telefon || "-"
      : "-",
  tarih: transaction.tarih || transaction.createdAt,
  urunBilgisi: `${item.urunKodu} (x${item.adet})`,
  urunKodu: item.urunKodu,
  adet: Number(item.adet || 0),
  envanterAciklamasi: item.envanterAciklamasi || "-",
});

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [selectedDeliverItem, setSelectedDeliverItem] = useState(null);
  const [deliverQuantity, setDeliverQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadInventory = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getPendingInventory();
      const items = [];
      (Array.isArray(data) ? data : []).forEach((transaction) => {
        const urunler = Array.isArray(transaction.urunler)
          ? transaction.urunler
          : [];
        urunler.forEach((item, index) => {
          if (!item.envanterdeMi) return;
          items.push(
            normalizeInventoryItem(
              { ...item, productIndex: index },
              transaction,
            ),
          );
        });
      });
      setInventoryItems(items);
    } catch (error) {
      console.error("Hata Detayı:", error);
      setErrorMessage("Envanter verileri yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return inventoryItems;

    return inventoryItems.filter(
      (item) =>
        item.musteriAd.toLowerCase().includes(query) ||
        item.telefon.replace(/\s/g, "").includes(query.replace(/\s/g, "")) ||
        item.urunKodu.toLowerCase().includes(query) ||
        item.urunBilgisi.toLowerCase().includes(query) ||
        item.envanterAciklamasi.toLowerCase().includes(query),
    );
  }, [inventoryItems, searchQuery]);

  const inventorySummary = useMemo(() => {
    const totalAdet = inventoryItems.reduce(
      (sum, item) => sum + Number(item.adet || 0),
      0,
    );
    return {
      uniqueCount: inventoryItems.length,
      totalAdet,
    };
  }, [inventoryItems]);

  const maxDeliverable = selectedDeliverItem
    ? Number(selectedDeliverItem.adet || 1)
    : 1;

  const openDeliverModal = (item) => {
    setSelectedDeliverItem(item);
    setDeliverQuantity("1");
    setIsDeliveryModalOpen(true);
  };

  const closeDeliverModal = () => {
    setIsDeliveryModalOpen(false);
    setSelectedDeliverItem(null);
    setDeliverQuantity("1");
  };

  const handleQuantityChange = (event) => {
    const rawValue = event.target.value;

    if (rawValue === "") {
      setDeliverQuantity("");
      return;
    }

    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) return;

    const safeValue = Math.min(Math.max(numericValue, 1), maxDeliverable);
    setDeliverQuantity(String(safeValue));
  };

  const handleConfirmDelivery = async () => {
    if (!selectedDeliverItem) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const parsedQuantity = Number(deliverQuantity);
      const safeQuantity = Number.isNaN(parsedQuantity)
        ? 1
        : Math.min(Math.max(parsedQuantity, 1), maxDeliverable);

      await deliverInventoryItem({
        transactionId: selectedDeliverItem.transactionId,
        urunKodu: selectedDeliverItem.urunKodu,
        teslimEdilecekAdet: safeQuantity,
      });

      await loadInventory();
      closeDeliverModal();
      toast.success("Ürün başarıyla teslim edildi.");
    } catch (error) {
      console.error("Hata Detayı:", error);
      setErrorMessage(
        error?.response?.data?.message || "Teslimat işlemi başarısız oldu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2
            className="text-2xl font-semibold text-on-surface"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Emanetler
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Depoda bekleyen tüm müşteri ürünleri
          </p>
        </div>
        <span className="text-sm font-semibold bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant shrink-0">
          Toplam: {inventoryItems.length} ürün
        </span>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-6 text-sm text-on-surface-variant">
          Yükleniyor...
        </div>
      ) : null}

      <div className="rounded-xl border border-primary-container/50 bg-primary-container/10 px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Depo Özeti
        </p>
        <p className="mt-1 text-sm font-medium text-on-surface">
          Depo Özeti: {inventorySummary.uniqueCount} Kalem (Çeşit) Ürün | Toplam{" "}
          {inventorySummary.totalAdet} Parça Bekliyor
        </p>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Müşteri adı, telefon veya ürün kodu ile ara..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/30 transition-all shadow-sm"
        />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {filteredItems.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-16">
              {inventoryItems.length === 0
                ? "Depoda bekleyen ürün bulunmamaktadır"
                : "Arama kriterlerine uygun ürün bulunamadı"}
            </p>
          ) : (
            <table className="w-full text-left border-collapse min-w-180">
              <thead>
                <tr className="bg-surface-variant border-b border-outline-variant">
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Müşteri Adı
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Telefon
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Satış Tarihi
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Ürün Bilgisi
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Envanter Açıklaması
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant text-right">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={`${item.transactionId}-${item.urunKodu}`}
                    className="border-b border-outline-variant hover:bg-surface-container transition-colors"
                  >
                    <td className="p-4 text-sm font-medium text-on-surface">
                      {item.musteriAd}
                    </td>
                    <td className="p-4 text-sm text-on-surface-variant">
                      {item.telefon}
                    </td>
                    <td className="p-4 text-sm text-on-surface">
                      {formatDate(item.tarih)}
                    </td>
                    <td className="p-4 text-sm text-on-surface">
                      {item.urunBilgisi}
                    </td>
                    <td className="p-4 text-sm text-on-surface-variant max-w-55">
                      {item.envanterAciklamasi}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openDeliverModal(item)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors rounded-lg px-3 py-2 active:scale-95 cursor-pointer"
                      >
                        <PackageCheck size={16} />
                        Teslim Et
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={isDeliveryModalOpen}
        onClose={closeDeliverModal}
        title="Teslimat Miktarı"
        size="md"
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
            <p className="text-sm text-on-surface-variant">Ürün</p>
            <p className="mt-1 text-base font-semibold text-on-surface">
              {selectedDeliverItem?.urunBilgisi}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Depodaki Toplam Adet:{" "}
              <span className="font-semibold text-on-surface">
                {maxDeliverable}
              </span>
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-on-surface">
              Teslim Edilecek Adet
            </span>
            <input
              type="number"
              min="1"
              max={maxDeliverable}
              value={deliverQuantity}
              onChange={handleQuantityChange}
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/30"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              onClick={closeDeliverModal}
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container cursor-pointer"
            >
              İptal
            </button>
            <button
              onClick={handleConfirmDelivery}
              disabled={isSubmitting}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "İşleniyor..." : "Teslim Et"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
