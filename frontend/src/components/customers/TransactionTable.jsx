import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { computeRunningBalances } from "../../utils/transactions";
import { odemeYontemleri } from "../../data/fakeData";

function TransactionBadge({ type, odemeYontemi }) {
  const method = odemeYontemi || "Veresiye";

  if (type === "Satış") {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full bg-error-container text-on-error-container text-xs font-medium">
        Satış - {method}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
      Tahsilat - {method}
    </span>
  );
}

function getTransactionDescription(tx) {
  const manualText = tx.aciklama && tx.aciklama.trim();
  if (tx.islemTuru === "Satış") {
    return tx.urunBilgisi || tx.urunler?.[0]?.urunKodu || manualText || "-";
  }

  return manualText || "-";
}

const DATE_SORT_OPTIONS = [
  { value: "desc", label: "En yeniden eskiye" },
  { value: "asc", label: "En eskiden yeniye" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Tüm İşlemler" },
  { value: "gelir", label: "Gelir (Tahsilat)" },
  { value: "gider", label: "Gider (Satış)" },
];

const selectClass =
  "text-xs bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 text-on-surface";

export default function TransactionTable({ transactions }) {
  const [dateSort, setDateSort] = useState("desc");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const paymentOptions = useMemo(() => {
    const fromTx = transactions.map((t) => t.odemeYontemi).filter(Boolean);
    return [...new Set([...odemeYontemleri, ...fromTx])].sort();
  }, [transactions]);

  const rows = useMemo(() => {
    let result = computeRunningBalances(transactions);

    if (typeFilter === "gelir") {
      result = result.filter((tx) => tx.islemTuru === "Tahsilat");
    } else if (typeFilter === "gider") {
      result = result.filter((tx) => tx.islemTuru === "Satış");
    }

    if (paymentFilter !== "all") {
      result = result.filter((tx) => tx.odemeYontemi === paymentFilter);
    }

    if (dateSort === "asc") {
      result = [...result].reverse();
    }

    return result;
  }, [transactions, dateSort, typeFilter, paymentFilter]);

  const getRemainingAmount = (tx) => {
    if (tx.islemTuru === "Tahsilat") {
      return Number(tx.kalanHesap ?? tx.kalan ?? 0);
    }

    return Number(tx.kalan ?? tx.kalanHesap ?? 0);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg flex-grow flex flex-col overflow-hidden shadow-sm">
      <div className="p-4 border-b border-outline-variant bg-surface space-y-3">
        <h3
          className="text-lg font-semibold text-on-surface"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          Geçmiş İşlemler
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value)}
            className={selectClass}
            aria-label="Tarih sıralaması"
          >
            {DATE_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectClass}
            aria-label="İşlem türü filtresi"
          >
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className={selectClass}
            aria-label="Ödeme yöntemi filtresi"
          >
            <option value="all">Tüm Ödeme Yöntemleri</option>
            {paymentOptions.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto flex-grow">
        {rows.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-12">
            {transactions.length === 0
              ? "Henüz işlem kaydı yok"
              : "Filtrelere uygun işlem bulunamadı"}
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-variant border-b border-outline-variant">
                <th className="p-4 text-xs font-semibold text-on-surface-variant">
                  Tarih
                </th>
                <th className="p-4 text-xs font-semibold text-on-surface-variant">
                  İşlem Türü
                </th>
                <th className="p-4 text-xs font-semibold text-on-surface-variant">
                  Açıklama
                </th>
                <th className="p-4 text-xs font-semibold text-on-surface-variant">
                  Defter
                </th>
                <th className="p-4 text-xs font-semibold text-on-surface-variant text-right">
                  Tutar
                </th>
                <th className="p-4 text-xs font-semibold text-on-surface-variant text-right">
                  Kalan
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-outline-variant hover:bg-surface-container transition-colors"
                >
                  <td className="p-4 text-sm text-on-surface">
                    {formatDate(tx.tarih)}
                  </td>
                  <td className="p-4">
                    <TransactionBadge
                      type={tx.islemTuru}
                      odemeYontemi={tx.odemeYontemi}
                      pesinat={tx.pesinat}
                    />
                  </td>
                  <td className="p-4 text-sm text-on-surface-variant">
                    {getTransactionDescription(tx)}
                  </td>
                  <td className="p-4 text-sm text-on-surface-variant">
                    {tx.kayitDefteri || "-"}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-sm font-semibold ${
                          tx.islemTuru === "Satış"
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatCurrency(Number(tx.toplamTutar ?? tx.tutar ?? 0))}
                      </span>
                      {tx.islemTuru === "Satış" &&
                        Number(tx.pesinat || 0) > 0 && (
                          <span className="text-[11px] text-on-surface-variant mt-1">
                            (Peşinat: {formatCurrency(Number(tx.pesinat || 0))})
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-semibold text-on-surface text-right">
                    {formatCurrency(getRemainingAmount(tx))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
