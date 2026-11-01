import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../services/dashboardService";
import {
  Wallet,
  AlertCircle,
  PackageCheck,
  AlertTriangle,
  Search,
  UserCheck,
  ArrowUpRight,
  PlusCircle,
  Filter,
  Clock,
} from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function DashboardPage({ onNewCustomerSale }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Son Hareketler tablosu filtreleri
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "Satış" | "Tahsilat"
  const [personelFilter, setPersonelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const {
    gunlukKasa = 0,
    toplamAcikAlacak = 0,
    alacakliMusteriSayisi = 0,
    emanetteBekleyenAdet = 0,
    emanetteBekleyenKayitSayisi = 0,
    kritikStokSayisi = 0,
    magazaHareketleri = [],
    personelListesi = [],
  } = data || {};

  const personelOptions = useMemo(() => {
    const namesFromTx = magazaHareketleri
      .map((item) => item.personelAdi)
      .filter(Boolean);
    const namesFromUsers = personelListesi
      .map((u) => u.adSoyad)
      .filter(Boolean);
    return [...new Set([...namesFromUsers, ...namesFromTx])];
  }, [magazaHareketleri, personelListesi]);

  const filteredHareketler = useMemo(() => {
    const q = searchQuery.toLocaleLowerCase("tr-TR").trim();
    return magazaHareketleri.filter((item) => {
      if (typeFilter !== "all" && item.islemTuru !== typeFilter) {
        return false;
      }
      if (personelFilter !== "all" && item.personelAdi !== personelFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (item.musteriAdSoyad || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (item.personelAdi || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (item.detay || "").toLocaleLowerCase("tr-TR").includes(q) ||
        String(item.musteriNo || "").includes(q)
      );
    }).slice(0, 15);
  }, [magazaHareketleri, typeFilter, personelFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm font-medium">
        Dashboard verileri yükleniyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center text-sm border border-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full flex-1">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Mağaza Genel Bakış (Dashboard)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("tr-TR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/musteri-finans")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Wallet size={16} />
            Cari & Tahsilat
          </button>
          <button
            type="button"
            onClick={onNewCustomerSale}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle size={16} />
            Yeni Müşteri & Satış
          </button>
        </div>
      </div>

      {/* %20 Üst Alan: 4 Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Bugünün Kasası */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Bugünün Kasası
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Günlük Tahsilat / Peşinat Toplamı
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">
              {formatCurrency(gunlukKasa)}
            </p>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Bugün
            </span>
          </div>
        </div>

        {/* 2. Toplam Açık Alacak */}
        <div
          onClick={() => navigate("/musteri-finans")}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-red-300 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Toplam Açık Alacak
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tüm Müşterilerdeki Toplam Borç
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-2xl font-extrabold text-red-600 tracking-tight">
              {formatCurrency(toplamAcikAlacak)}
            </p>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-red-600 flex items-center gap-0.5">
              {alacakliMusteriSayisi} borçlu
              <ArrowUpRight size={13} />
            </span>
          </div>
        </div>

        {/* 3. Emanette Bekleyen Ürünler */}
        <div
          onClick={() => navigate("/envanter")}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Emanette Bekleyen Ürünler
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Satışı yapılıp teslim bekleyen ürünler
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <PackageCheck size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {emanetteBekleyenAdet}{" "}
              <span className="text-sm font-semibold text-slate-500">adet</span>
            </p>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 flex items-center gap-0.5">
              {emanetteBekleyenKayitSayisi} teslimat
              <ArrowUpRight size={13} />
            </span>
          </div>
        </div>

        {/* 4. Kritik Stoktaki Ürünler */}
        <div
          onClick={() => navigate("/urun-stok")}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-300 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Kritik Stoktaki Ürünler
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kritik seviye ve altındaki stoklar
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-2xl font-extrabold text-amber-600 tracking-tight">
              {kritikStokSayisi}{" "}
              <span className="text-sm font-semibold text-slate-500">ürün</span>
            </p>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-600 flex items-center gap-0.5">
              Stok Yönetimi
              <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      </div>

      {/* %80 Alt Alan: Dev "Mağaza Hareketleri / Son İşlemler" Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col flex-1 min-h-[520px] overflow-hidden">
        {/* Tablo Üst Başlık ve Filtre Kontrol Çubuğu */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Mağaza Hareketleri / Son İşlemler
                </h2>
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
                  Son {filteredHareketler.length} İşlem
                </span>
              </div>
              <p className="text-xs text-slate-500">
                En yeniden eskiye doğru mağazada gerçekleşen en güncel son 15 işlem hareketi
              </p>
            </div>
          </div>

          {/* Hızlı Filtre Çubuğu: Satışlar, Tahsilatlar, Personele Göre, Arama */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* İşlem Türü Hızlı Filtre Butonları */}
            <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1">
              {[
                { id: "all", label: "Tüm İşlemler" },
                { id: "Satış", label: "Satışlar" },
                { id: "Tahsilat", label: "Tahsilatlar" },
              ].map((tab) => {
                const active = typeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTypeFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Personele Göre Filtre */}
            <div className="relative">
              <UserCheck
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={personelFilter}
                onChange={(e) => setPersonelFilter(e.target.value)}
                aria-label="Personele Göre Filtrele"
                className="pl-8 pr-7 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Tüm Personeller</option>
                {personelOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Arama Çubuğu */}
            <div className="relative min-w-[210px] flex-1 sm:flex-initial">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Müşteri, ürün kodu veya personel..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {(typeFilter !== "all" || personelFilter !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setPersonelFilter("all");
                  setSearchQuery("");
                }}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
              >
                Filtreyi Temizle
              </button>
            )}
          </div>
        </div>

        {/* Tablo Gövdesi */}
        <div className="overflow-x-auto flex-1">
          {filteredHareketler.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Filter size={36} className="mb-2 opacity-30" />
              <p className="text-sm font-medium text-slate-600">
                Seçili filtrelere uygun mağaza hareketi bulunamadı.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5 font-semibold whitespace-nowrap">
                    Tarih & Saat
                  </th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">
                    İşlemi Yapan Personel
                  </th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">
                    Müşteri Adı Soyadı
                  </th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">
                    İşlem Türü
                  </th>
                  <th className="px-4 py-3.5 font-semibold">
                    Detay / Ürün Kodu
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-right whitespace-nowrap">
                    İşlem Tutarı
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHareketler.map((item) => {
                  const isSale = item.islemTuru === "Satış";
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {formatDateTime(item.tarih)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <UserCheck size={13} className="text-blue-600" />
                          {item.personelAdi}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">
                          {item.musteriAdSoyad}
                        </div>
                        {item.musteriNo ? (
                          <div className="text-[11px] text-slate-400">
                            Müşteri No: #{item.musteriNo}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isSale ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Satış • {item.odemeYontemi}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Tahsilat • {item.odemeYontemi}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 text-xs sm:text-sm max-w-md">
                        {item.detay}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span
                            className={`text-sm font-extrabold ${
                              isSale ? "text-slate-900" : "text-emerald-600"
                            }`}
                          >
                            {isSale ? "" : "+"}
                            {formatCurrency(item.tutar)}
                          </span>
                          {isSale && item.pesinat > 0 && (
                            <span className="text-[11px] text-emerald-600 font-medium">
                              Peşinat: {formatCurrency(item.pesinat)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
