import React, { useEffect, useState } from "react";
import { getDashboardSummary } from "../services/dashboardService";
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
};

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const summary = await getDashboardSummary();
        setData(summary);
      } catch (err) {
        setError("Dashboard verileri yüklenemedi.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center shadow-sm">
        {error}
      </div>
    );
  }

  const {
    gunlukKasa = 0,
    vadesiGecenAlacak = 0,
    bugunkuSevkiyatlar = { sayi: 0, liste: [] },
    kritikStokSayisi = 0,
    riskliTaksitler = [],
  } = data || {};

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center space-x-4 border-l-4 border-emerald-500">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full flex-shrink-0">
            <CurrencyDollarIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Bugünün Kasası</p>
            <p className="text-2xl font-bold text-gray-900 truncate">
              {formatCurrency(gunlukKasa)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center space-x-4 border-l-4 border-red-500">
          <div className="p-3 bg-red-100 text-red-600 rounded-full flex-shrink-0">
            <ExclamationTriangleIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Geciken Alacak</p>
            <p className="text-2xl font-bold text-gray-900 truncate">
              {formatCurrency(vadesiGecenAlacak)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center space-x-4 border-l-4 border-blue-500">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full flex-shrink-0">
            <TruckIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Bugünkü Sevkiyat</p>
            <p className="text-2xl font-bold text-gray-900">
              {bugunkuSevkiyatlar.sayi}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center space-x-4 border-l-4 border-orange-500">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full flex-shrink-0">
            <ArchiveBoxIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Kritik Stok</p>
            <p className="text-2xl font-bold text-gray-900">
              {kritikStokSayisi} Ürün
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Bugünkü Sevkiyat Planı */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">
              Bugünün Sevkiyat Planı
            </h2>
          </div>
          <div className="p-6 flex-grow overflow-auto" style={{ maxHeight: '500px' }}>
            {bugunkuSevkiyatlar.liste.length > 0 ? (
              <ul className="space-y-4">
                {bugunkuSevkiyatlar.liste.map((sevkiyat) => (
                  <li
                    key={sevkiyat._id}
                    className="border border-gray-100 p-4 rounded-xl flex flex-col space-y-2 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-gray-800">
                        {sevkiyat.customerId?.ad} {sevkiyat.customerId?.soyad}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                        {sevkiyat.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Tel: {sevkiyat.customerId?.telefon || "-"}
                    </div>
                    <div className="text-sm text-gray-500">
                      Adres: {sevkiyat.customerId?.adres || "-"}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        Ürünler:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {sevkiyat.products?.map((p, i) => (
                          <li key={i} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2"></span>
                            {p.urunAdi} (x{p.adet})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                <TruckIcon className="w-12 h-12 mb-3 opacity-20" />
                <p>Bugün için planlanmış sevkiyat bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Kritik Bekleyen Tahsilatlar */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">
              Kritik Bekleyen Tahsilatlar
            </h2>
          </div>
          <div className="p-6 flex-grow overflow-auto" style={{ maxHeight: '500px' }}>
            {riskliTaksitler.length > 0 ? (
              <ul className="space-y-4">
                {riskliTaksitler.map((taksit) => (
                  <li
                    key={taksit._id}
                    className="border border-red-100 p-4 rounded-xl flex flex-col space-y-2 hover:shadow-md transition-shadow bg-red-50/30"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-gray-800">
                        {taksit.customerId?.ad} {taksit.customerId?.soyad}
                      </span>
                      <span className="font-bold text-red-600 text-lg">
                        {formatCurrency(taksit.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">
                        Tel: {taksit.customerId?.telefon || "-"}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                        Vade: {new Date(taksit.dueDate).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Taksit No: {taksit.installmentNumber}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                <ExclamationTriangleIcon className="w-12 h-12 mb-3 opacity-20" />
                <p>Vadesi geçmiş riskli taksit bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
