import { Search } from "lucide-react";
import { getFullName } from "../../utils/formatters";

export default function CustomerList({
  customers,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelect,
}) {
  return (
    <div className="w-full lg:w-1/3 flex flex-col bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden h-[600px]">
      <div className="p-4 border-b border-outline-variant bg-surface">
        <div className="relative flex items-center">
          <Search
            size={18}
            className="absolute left-3 text-on-surface-variant pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/30 transition-all"
            placeholder="İsim, TC veya Telefon ile ara..."
          />
        </div>
      </div>
      <div className="flex-grow overflow-y-auto customer-list-scroll p-2 flex flex-col gap-1">
        {customers.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-8">
            Müşteri bulunamadı
          </p>
        ) : (
          customers.map((customer) => {
            const isActive = customer.id === selectedId;
            return (
              <div
                key={customer.id}
                onClick={() => onSelect(customer.id)}
                className={`p-4 rounded-lg cursor-pointer transition-colors border-l-4 ${
                  isActive
                    ? "bg-surface-container border-primary"
                    : "border-transparent hover:bg-surface-container"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex shrink-0 items-center rounded-md bg-primary-container/10 border border-primary-container/20 px-2 py-0.5 text-xs font-bold text-primary-container">
                      No: {customer.musteriNo || "-"}
                    </span>
                    <h4 className="text-sm font-semibold text-on-surface">
                      {getFullName(customer)}
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  TC: {customer.tc} • {customer.telefon}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
