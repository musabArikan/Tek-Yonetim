import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { computeRunningBalances } from "../../utils/transactions";
import { odemeYontemleri } from "../../data/fakeData";

function TransactionBadge({ type, odemeYontemi }) {
  const method = odemeYontemi || "Veresiye";

  if (type === "Satış") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
        Satış • {method}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
      Tahsilat • {method}
    </span>
  );
}

function renderTransactionDescription(tx) {
  const manualText = tx.aciklama && tx.aciklama.trim();

  if (tx.islemTuru === "Satış") {
    const items = Array.isArray(tx.urunler) ? tx.urunler : [];
    if (items.length > 0) {
      return (
        <div className="space-y-1">
          <div className="flex flex-col gap-1">
            {items.map((item, idx) => {
              const code = item.urunKodu || "";
              const name = item.urunAdi && item.urunAdi !== code ? item.urunAdi : "";
              const qty = Number(item.adet || 1);
              return (
                <div key={`${code}-${idx}`} className="text-xs sm:text-sm text-slate-800">
                  <span className="font-bold text-slate-900">{code}</span>
                  {name ? <span className="text-slate-600"> — {name}</span> : null}
                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    x{qty}
                  </span>
                </div>
              );
            })}
          </div>
          {manualText ? (
            <div className="text-xs text-slate-500 italic">Not: {manualText}</div>
          ) : null}
        </div>
      );
    }
    return <span className="text-sm text-slate-700">{tx.urunBilgisi || manualText || "Ürün Satışı"}</span>;
  }

  return (
    <span className="text-sm text-slate-700">
      {manualText || "Cari borç tahsilatı"}
    </span>
  );
}

const DATE_SORT_OPTIONS = [
  { value: "desc", label: "En yeniden eskiye" },
  { value: "asc", label: "En eskiden yeniye" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Tüm İşlemler" },
  { value: "satis", label: "Sadece Satışlar" },
  { value: "tahsilat", label: "Sadece Tahsilatlar" },
];

const selectClass =
  "text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-slate-700 font-medium";

export default function TransactionTable({ transactions = [], title = "İşlem ve Ürün Geçmişi" }) {
  const [dateSort, setDateSort] = useState("desc");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const paymentOptions = useMemo(() => {
    const fromTx = transactions.map((t) => t.odemeYontemi).filter(Boolean);
    return [...new Set([...odemeYontemleri, ...fromTx])].sort();
  }, [transactions]);

  const rows = useMemo(() => {
    let result = computeRunningBalances(transactions);

    if (typeFilter === "tahsilat") {
      result = result.filter((tx) => tx.islemTuru === "Tahsilat");
    } else if (typeFilter === "satis") {
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

  const getRunningBalanceAfter = (tx) => {
    if (tx.islemSonrasiBakiye !== undefined && tx.islemSonrasiBakiye !== null) {
      return Number(tx.islemSonrasiBakiye);
    }
    return Number(tx.kalanHesap ?? tx.kalan ?? 0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex-grow flex flex-col overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Müşterinin tüm ürün alımları ve tahsilat hareketleri ({rows.length} kayıt)
          </p>
        </div>
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
          <p className="text-sm text-slate-400 text-center py-12">
            {transactions.length === 0
              ? "Bu müşteriye ait henüz işlem kaydı bulunmuyor."
              : "Seçili filtrelere uygun işlem bulunamadı."}
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5 font-semibold">Tarih</th>
                <th className="px-4 py-3.5 font-semibold">İşlem Türü</th>
                <th className="px-4 py-3.5 font-semibold">Açıklama (Alınan Ürünler / Tahsilat Notu)</th>
                <th className="px-5 py-3.5 font-semibold text-right">İşlem Tutarı</th>
                <th className="px-5 py-3.5 font-semibold text-right">Kalan Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((tx) => {
                const isSale = tx.islemTuru === "Satış";
                const txAmount = Number(
                  isSale
                    ? (tx.toplamTutar ?? tx.tutar ?? 0)
                    : (tx.odenenTutar ?? tx.tutar ?? tx.toplamTutar ?? tx.pesinat ?? 0),
                );
                const pesinat = Number(tx.pesinat || 0);
                const remainingBalance = getRunningBalanceAfter(tx);

                return (
                  <tr
                    key={tx.id || tx._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap font-medium">
                      {formatDate(tx.tarih)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <TransactionBadge
                        type={tx.islemTuru}
                        odemeYontemi={tx.odemeYontemi}
                      />
                    </td>
                    <td className="px-4 py-4">
                      {renderTransactionDescription(tx)}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-sm font-bold ${
                            isSale ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {isSale ? "" : "-"}
                          {formatCurrency(txAmount)}
                        </span>
                        {isSale && pesinat > 0 && (
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            Peşinat: {formatCurrency(pesinat)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-right whitespace-nowrap">
                      <span
                        className={
                          remainingBalance > 0 ? "text-red-600" : "text-slate-600"
                        }
                      >
                        {formatCurrency(remainingBalance)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
