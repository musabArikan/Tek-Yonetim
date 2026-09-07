import { getFullName } from "./formatters";
import { formatUrunDisplay } from "./products";

export function getInventoryItems(transactions, customers) {
  const items = [];

  transactions.forEach((tx) => {
    if (tx.islemTuru !== "Satış" || !tx.urunler?.length) return;

    const customer = customers.find((c) => c.id === tx.musteriId);

    tx.urunler.forEach((urun, productIndex) => {
      if (!urun.envanterdeMi) return;

      items.push({
        transactionId: tx.id,
        productIndex,
        musteriId: tx.musteriId,
        musteriAd: customer ? getFullName(customer) : "Bilinmeyen Müşteri",
        telefon: customer?.telefon || "-",
        tarih: tx.tarih,
        urunBilgisi: formatUrunDisplay(urun),
        urunKodu: urun.urunKodu,
        adet: Number(urun.adet) || 1,
        envanterAciklamasi: urun.envanterAciklamasi || "-",
      });
    });
  });

  return items.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
}

export function getCustomerInventoryItems(transactions, customers, musteriId) {
  return getInventoryItems(transactions, customers).filter(
    (item) => item.musteriId === musteriId,
  );
}

export function filterInventoryItems(items, searchQuery) {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return items;

  return items.filter(
    (item) =>
      item.musteriAd.toLowerCase().includes(q) ||
      item.telefon.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
      item.urunKodu.toLowerCase().includes(q) ||
      item.urunBilgisi.toLowerCase().includes(q) ||
      item.envanterAciklamasi.toLowerCase().includes(q),
  );
}
