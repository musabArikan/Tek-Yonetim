export function formatCurrency(amount) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getInitials(ad, soyad) {
  return `${(ad?.[0] || "").toUpperCase()}${(soyad?.[0] || "").toUpperCase()}`;
}

export function getFullName(customer) {
  return `${customer.ad} ${customer.soyad}`;
}
