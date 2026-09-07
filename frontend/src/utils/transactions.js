export function computeRunningBalances(transactions) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.tarih) - new Date(b.tarih),
  );

  let balance = 0;
  const withBalance = sorted.map((tx) => {
    if (tx.islemTuru === "Satış") {
      const saleRemaining =
        tx.kalanHesap ?? Math.max(0, Number(tx.toplamTutar || 0) - Number(tx.pesinat || 0));
      balance += Number(saleRemaining || 0);
    } else {
      const collectionAmount =
        tx.odenenTutar ?? tx.tutar ?? tx.toplamTutar ?? tx.pesinat ?? 0;
      balance = Math.max(0, balance - Number(collectionAmount || 0));
    }

    return {
      ...tx,
      kalan:
        tx.kalanHesap === undefined || tx.kalanHesap === null
          ? balance
          : Number(tx.kalanHesap),
    };
  });

  return withBalance.reverse();
}

export function getCustomerTransactions(transactions, musteriId) {
  return transactions.filter((tx) => tx.musteriId === musteriId);
}

export function getTotalReceivables(customers) {
  return customers.reduce((sum, c) => sum + c.toplamKalanBakiye, 0);
}
