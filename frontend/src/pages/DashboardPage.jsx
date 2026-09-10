import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardService";
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  ArchiveBoxIcon,
  UserPlusIcon,
  BanknotesIcon,
  ArrowsRightLeftIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
};

export default function DashboardPage({ onNewCustomerSale }) {
  const navigate = useNavigate();
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
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-medium">
        Yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center text-sm border border-red-100">
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
    sonHareketler = [],
  } = data || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Genel Bakış</h1>
        <div className="text-sm text-slate-500">{new Date().toLocaleDateString("tr-TR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Bugünün Kasası</p>
            <CurrencyDollarIcon className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {formatCurrency(gunlukKasa)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Geciken Alacak</p>
            <ExclamationTriangleIcon className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {formatCurrency(vadesiGecenAlacak)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Bugünkü Sevkiyat</p>
            <TruckIcon className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {bugunkuSevkiyatlar.sayi}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Kritik Stok</p>
            <ArchiveBoxIcon className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {kritikStokSayisi} <span className="text-sm font-normal text-slate-500">ürün</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions (Hızlı İşlemler) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-4 items-center justify-start">
        <span className="text-sm font-semibold text-slate-700 mr-2">Hızlı İşlemler:</span>
        <button
          onClick={onNewCustomerSale}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <UserPlusIcon className="w-4 h-4" /> Yeni Müşteri & Satış
        </button>
        <button
          onClick={() => navigate('/musteri-finans')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <BanknotesIcon className="w-4 h-4" /> Hızlı Tahsilat
        </button>
        <button
          onClick={() => navigate('/transferler')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowsRightLeftIcon className="w-4 h-4" /> Yeni Transfer
        </button>
      </div>

      {/* Layout Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bugünkü Sevkiyat Planı */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Bugünün Sevkiyat Planı
            </h2>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
              {bugunkuSevkiyatlar.liste.length} Kayıt
            </span>
          </div>
          <div className="p-0 flex-grow overflow-auto" style={{ maxHeight: '400px' }}>
            {bugunkuSevkiyatlar.liste.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {bugunkuSevkiyatlar.liste.map((sevkiyat) => (
                  <li
                    key={sevkiyat._id}
                    className="p-5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-900 text-sm">
                        {sevkiyat.customerId?.ad} {sevkiyat.customerId?.soyad}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">
                        {sevkiyat.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mb-3 space-y-1">
                      <div>Tel: {sevkiyat.customerId?.telefon || "-"}</div>
                      <div className="truncate">Adres: {sevkiyat.customerId?.adres || "-"}</div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        Ürünler
                      </p>
                      <ul className="text-sm text-slate-700 space-y-1.5">
                        {sevkiyat.products?.map((p, i) => (
                          <li key={i} className="flex items-center">
                            <span className="w-1 h-1 bg-slate-300 rounded-full mr-2.5"></span>
                            {p.urunAdi} <span className="text-slate-400 ml-1">(x{p.adet})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <TruckIcon className="w-8 h-8 mb-3 opacity-50 stroke-1" />
                <p className="text-sm">Bugün için planlanmış sevkiyat bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Kritik Bekleyen Tahsilatlar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Kritik Bekleyen Tahsilatlar
            </h2>
            <span className="text-xs font-medium bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full">
              {riskliTaksitler.length} Risk
            </span>
          </div>
          <div className="p-0 flex-grow overflow-auto" style={{ maxHeight: '400px' }}>
            {riskliTaksitler.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {riskliTaksitler.map((taksit) => (
                  <li
                    key={taksit._id}
                    className="p-5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-900 text-sm">
                        {taksit.customerId?.ad} {taksit.customerId?.soyad}
                      </span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {formatCurrency(taksit.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        Tel: {taksit.customerId?.telefon || "-"}
                      </span>
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        Vade: {new Date(taksit.dueDate).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2 flex items-center">
                       <span className="w-1 h-1 bg-slate-300 rounded-full mr-2"></span>
                       Taksit No: {taksit.installmentNumber}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <ExclamationTriangleIcon className="w-8 h-8 mb-3 opacity-50 stroke-1" />
                <p className="text-sm">Vadesi geçmiş riskli taksit bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Third Column: Son Hareketler */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Son Hareketler
            </h2>
            <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full">
              {sonHareketler.length} İşlem
            </span>
          </div>
          <div className="p-0 flex-grow overflow-auto" style={{ maxHeight: '400px' }}>
            {sonHareketler.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {sonHareketler.map((islem) => (
                  <li
                    key={islem._id}
                    className="p-5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-900 text-sm">
                        {islem.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {new Date(islem.createdAt).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Kullanıcı: <span className="font-medium text-slate-700">{islem.userName}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <ClockIcon className="w-8 h-8 mb-3 opacity-50 stroke-1" />
                <p className="text-sm">Henüz bir işlem kaydedilmemiş.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
