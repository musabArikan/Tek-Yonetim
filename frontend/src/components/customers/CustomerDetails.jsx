import { BadgeCheck, Phone, MapPin, Wallet } from "lucide-react";
import { formatCurrency, formatDate, getFullName, getInitials } from "../../utils/formatters";

export default function CustomerDetails({
  customer,
  onAddCollection,
  onDeleteCustomer,
  isDeletingCustomer = false,
  canCollect = false,
  canDeleteCustomer = false,
}) {
  if (!customer) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 flex items-center justify-center h-[200px]">
        <p className="text-on-surface-variant text-sm">Müşteri seçin</p>
      </div>
    );
  }

  const hasDebt = customer.toplamKalanBakiye > 0;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 bg-primary-container text-white rounded-full flex items-center justify-center text-xl font-semibold"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            {getInitials(customer.ad, customer.soyad)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-2xl font-semibold text-on-surface"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                {getFullName(customer)}
              </h2>
              <span className="inline-flex items-center rounded-full border border-primary-container/20 bg-primary-container/10 px-3 py-1 text-xs font-semibold text-primary-container">
                Müşteri No: #{customer.musteriNo || "-"}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Bireysel Müşteri • Kayıt: {formatDate(customer.kayitTarihi)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mt-2">
          <div className="flex items-center gap-2">
            <BadgeCheck size={16} className="text-on-surface-variant shrink-0" />
            <span className="text-sm text-on-surface">{customer.tc}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-on-surface-variant shrink-0" />
            <span className="text-sm text-on-surface">{customer.telefon}</span>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <MapPin size={16} className="text-on-surface-variant shrink-0" />
            <span className="text-sm text-on-surface">{customer.adres}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 md:mt-0 text-right">
        <p className="text-xs text-on-surface-variant">Toplam Kalan Bakiye</p>
        <h3
          className={`text-3xl font-bold ${
            customer.toplamKalanBakiye === 0 ? "text-on-surface" : "text-error"
          }`}
          style={{ fontFamily: "var(--font-headline)" }}
        >
          {formatCurrency(customer.toplamKalanBakiye)}
        </h3>
        {canCollect ? (
          <button
            onClick={onAddCollection}
            disabled={!hasDebt}
            className={`mt-2 text-sm font-semibold bg-primary-container text-white border border-primary-container rounded-lg px-4 py-2 flex items-center gap-2 ml-auto transition-opacity ${
              hasDebt
                ? "hover:opacity-90 active:scale-95 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            <Wallet size={18} />
            Tahsilat Ekle
          </button>
        ) : null}
        {canDeleteCustomer ? (
          <button
            type="button"
            onClick={() => onDeleteCustomer?.(customer)}
            disabled={isDeletingCustomer}
            className="mt-2 text-sm font-semibold bg-red-600 text-white border border-red-600 rounded-lg px-4 py-2 flex items-center gap-2 ml-auto transition-colors hover:bg-red-700 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isDeletingCustomer ? "Siliniyor..." : "Müşteriyi Sil"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
