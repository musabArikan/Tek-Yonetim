import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
  Package,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { getDashboardSummary } from "../../services/dashboardService";

// ─── Tek bir özet kartı ──────────────────────────────────────────────────────
function SummaryCard({
  title,
  value,
  subValue,
  icon: Icon,
  iconBg,
  valueColor = "text-on-surface",
  badge,
  isLoading,
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3">
      {/* Başlık satırı */}
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-on-surface-variant">{title}</p>
        <div
          className={`${iconBg} p-2 rounded-full flex items-center justify-center shrink-0`}
        >
          <Icon size={18} />
        </div>
      </div>

      {/* Ana değer */}
      {isLoading ? (
        <div className="h-8 w-32 bg-surface-container animate-pulse rounded" />
      ) : (
        <h3
          className={`text-2xl font-bold ${valueColor}`}
          style={{ fontFamily: "var(--font-headline)" }}
        >
          {value}
        </h3>
      )}

      {/* Alt bilgi / badge */}
      <div className="flex items-center gap-2 min-h-5">
        {!isLoading && subValue && (
          <span className="text-xs text-on-surface-variant">{subValue}</span>
        )}
        {!isLoading && badge && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.style}`}
          >
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kritik ürün liste satırı ────────────────────────────────────────────────
function CriticalStockRow({ urunKodu, marka, adet }) {
  return (
    <li className="flex items-center justify-between py-1.5 border-b border-outline-variant last:border-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-on-surface">{urunKodu}</span>
        {marka && (
          <span className="text-xs text-on-surface-variant">{marka}</span>
        )}
      </div>
      <span
        className={`text-sm font-bold tabular-nums ${
          adet === 0 ? "text-error" : "text-amber-600"
        }`}
      >
        {adet} adet
      </span>
    </li>
  );
}

// ─── Ana SummaryCards bileşeni ───────────────────────────────────────────────
export default function SummaryCards({
  // Geriye dönük uyumluluk için (App.jsx eski prop'ları geçirebilir)
  customerCount,
  transactionCount,
  totalReceivables,
}) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCriticalList, setShowCriticalList] = useState(false);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch {
      setError("Özet veriler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Fallback değerleri (API başarısız olursa prop'lardan gelir)
  const aylikSatis = summary?.kasa?.aylikSatis ?? 0;
  const gunlukSatis = summary?.kasa?.gunlukSatis ?? 0;
  const toplamAlacak =
    summary?.alacaklar?.toplamAlacak ?? totalReceivables ?? 0;
  const alacakliMusteri = summary?.alacaklar?.alacakliMusteriSayisi ?? 0;
  const kritikUrunSayisi = summary?.kritikStok?.urunSayisi ?? 0;
  const kritikUrunler = summary?.kritikStok?.urunler ?? [];
  const esik = summary?.kritikStok?.esik ?? 3;
  const bekleyenTeslimat =
    summary?.bekleyenEnvanter?.bekleyenTeslimatSayisi ?? 0;
  const bekleyenAdet = summary?.bekleyenEnvanter?.bekleyenToplamAdet ?? 0;

  const cards = [
    {
      id: "kasa",
      title: "Aylık Kasa",
      value: formatCurrency(aylikSatis),
      subValue: `Bugün: ${formatCurrency(gunlukSatis)}`,
      icon: TrendingUp,
      iconBg: "bg-primary-container text-on-primary",
      badge:
        gunlukSatis > 0
          ? { text: "Bugün aktif", style: "bg-green-100 text-green-700" }
          : null,
    },
    {
      id: "alacaklar",
      title: "Açık Alacaklar",
      value: formatCurrency(toplamAlacak),
      subValue:
        alacakliMusteri > 0 ? `${alacakliMusteri} müşteri borçlu` : "Borç yok",
      icon: Wallet,
      iconBg: "bg-error-container text-on-error-container",
      valueColor: toplamAlacak > 0 ? "text-error" : "text-on-surface",
      badge:
        alacakliMusteri > 0
          ? {
              text: `${alacakliMusteri} kişi`,
              style: "bg-red-100 text-red-700",
            }
          : null,
    },
    {
      id: "kritikStok",
      title: "Kritik Stok",
      value: `${kritikUrunSayisi} ürün`,
      subValue: `Eşik: ≤ ${esik} adet`,
      icon: AlertTriangle,
      iconBg:
        kritikUrunSayisi > 0
          ? "bg-amber-100 text-amber-700"
          : "bg-surface-variant text-on-surface-variant",
      valueColor:
        kritikUrunSayisi > 0 ? "text-amber-700" : "text-on-surface",
      badge:
        kritikUrunSayisi > 0
          ? {
              text: "Uyarı",
              style: "bg-amber-100 text-amber-700",
            }
          : { text: "Normal", style: "bg-green-100 text-green-700" },
    },
    {
      id: "envanter",
      title: "Bekleyen Teslimat",
      value: `${bekleyenTeslimat} kayıt`,
      subValue:
        bekleyenAdet > 0
          ? `Toplam ${bekleyenAdet} adet ürün bekliyor`
          : "Bekleyen teslimat yok",
      icon: bekleyenTeslimat > 0 ? Clock : Package,
      iconBg:
        bekleyenTeslimat > 0
          ? "bg-blue-100 text-blue-700"
          : "bg-surface-variant text-on-surface-variant",
      valueColor:
        bekleyenTeslimat > 0 ? "text-blue-700" : "text-on-surface",
      badge:
        bekleyenTeslimat > 0
          ? {
              text: `${bekleyenAdet} adet`,
              style: "bg-blue-100 text-blue-700",
            }
          : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Hata mesajı */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchSummary}
            className="ml-auto flex items-center gap-1 text-xs font-semibold hover:underline"
          >
            <RefreshCw size={12} />
            Yenile
          </button>
        </div>
      )}

      {/* Kart grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={
              card.id === "kritikStok" && kritikUrunSayisi > 0
                ? () => setShowCriticalList((v) => !v)
                : undefined
            }
            className={
              card.id === "kritikStok" && kritikUrunSayisi > 0
                ? "cursor-pointer"
                : ""
            }
            title={
              card.id === "kritikStok" && kritikUrunSayisi > 0
                ? "Kritik ürün listesini göster/gizle"
                : undefined
            }
          >
            <SummaryCard {...card} isLoading={isLoading} />
          </div>
        ))}
      </div>

      {/* Kritik stok detay listesi (toggle) */}
      {showCriticalList && !isLoading && kritikUrunler.length > 0 && (
        <div className="bg-surface-container-lowest border border-amber-200 rounded-xl p-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h4 className="text-sm font-bold text-amber-800">
                Kritik Stok Ürünleri ({kritikUrunler.length})
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowCriticalList(false)}
              className="text-xs text-on-surface-variant hover:text-on-surface"
            >
              Kapat
            </button>
          </div>
          <ul className="divide-y divide-outline-variant">
            {kritikUrunler.map((urun) => (
              <CriticalStockRow key={urun.urunKodu} {...urun} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
