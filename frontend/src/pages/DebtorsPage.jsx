import { formatCurrency, getFullName } from "../utils/formatters";

export default function DebtorsPage({ customers, onSelectCustomer }) {
  const debtors = customers
    .filter((customer) => Number(customer.toplamKalanBakiye || 0) > 0)
    .sort(
      (a, b) =>
        Number(b.toplamKalanBakiye || 0) - Number(a.toplamKalanBakiye || 0),
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2
            className="text-2xl font-semibold text-on-surface"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Borçlular
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Kalan bakiyesi bulunan müşteriler
          </p>
        </div>
        <span className="text-sm font-semibold bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant shrink-0">
          Toplam: {debtors.length} müşteri
        </span>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {debtors.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-12">
              Kalan borcu olan müşteri bulunmamaktadır
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-variant border-b border-outline-variant">
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    No
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Ad Soyad
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Telefon
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant text-right">
                    Kalan Borç
                  </th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => onSelectCustomer?.(customer.id)}
                    className="border-b border-outline-variant hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <td className="p-4 text-sm font-semibold text-primary-container">
                      #{customer.musteriNo || "-"}
                    </td>
                    <td className="p-4 text-sm font-medium text-on-surface">
                      {getFullName(customer)}
                    </td>
                    <td className="p-4 text-sm text-on-surface-variant">
                      {customer.telefon}
                    </td>
                    <td className="p-4 text-sm font-semibold text-error text-right">
                      {formatCurrency(customer.toplamKalanBakiye)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
