import React from "react";
import { Search, PlusCircle, ArrowRight } from "lucide-react";
import { getFullName } from "../utils/formatters";

export default function CustomersPage({
  customers,
  searchQuery,
  onSearchChange,
  onSelectCustomer,
  onNewCustomerSale,
}) {
  return (
    <div className="max-w-7xl mx-auto px-2 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Müşteriler</h1>
          <p className="text-sm text-slate-500 mt-1">Müşteri veritabanı, finans ve hesap yönetimi</p>
        </div>
        <button
          onClick={onNewCustomerSale}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={18} />
          Yeni Müşteri & Satış
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
              placeholder="İsim, TC veya Telefon ile ara..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Müşteri No</th>
                <th className="px-6 py-4">Ad Soyad</th>
                <th className="px-6 py-4">TC Kimlik</th>
                <th className="px-6 py-4">Telefon</th>
                <th className="px-6 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-sm text-slate-500">
                    Arama kriterlerine uygun müşteri bulunamadı.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => onSelectCustomer(customer.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {customer.musteriNo || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {getFullName(customer)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {customer.tc || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {customer.telefon || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 transition-colors gap-1 group-hover:underline"
                        onClick={(e) => {
                          e.stopPropagation(); // Satır tıklamasını engelleme, butona basıldığında da aynı yere gider ama click propagations'ı ayırabiliriz.
                          onSelectCustomer(customer.id);
                        }}
                      >
                        Müşteri Detayı
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
