import { Package } from "lucide-react";
import { formatDate } from "../../utils/formatters";

export default function PendingInventoryCard({ items }) {
  if (items.length === 0) {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3">
        <p className="text-xs text-on-surface-variant text-center">
          Depoda bekleyen ürünü bulunmamaktadır
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-outline-variant bg-surface flex items-center gap-2">
        <Package size={18} className="text-primary-container" />
        <h3
          className="text-sm font-semibold text-on-surface"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          Depoda Bekleyen Ürünler
        </h3>
        <span className="ml-auto text-xs font-semibold bg-primary-container text-white px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-outline-variant max-h-45 overflow-y-auto">
        {items.map((item) => (
          <div
            key={`${item.transactionId}-${item.productIndex}`}
            className="px-4 py-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
              <p className="text-sm font-semibold text-on-surface">
                {item.urunBilgisi}
              </p>
              <span className="text-xs text-on-surface-variant shrink-0">
                {formatDate(item.tarih)}
              </span>
            </div>
            {item.envanterAciklamasi && item.envanterAciklamasi !== "-" && (
              <p className="text-xs text-on-surface-variant mt-1 italic">
                {item.envanterAciklamasi}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
