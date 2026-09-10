import { useState, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  Package,
  TrendingUp,
  Wallet,
  PrinterIcon,
} from "lucide-react";
import api from "../utils/api";

const formatCurrency = (val) =>
  Number(val || 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Özet Kart ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "primary" }) {
  const colors = {
    primary: "bg-primary-container text-on-primary-container",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    orange: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-on-surface-variant font-medium">{label}</p>
        <p className="text-xl font-bold text-on-surface mt-0.5">{value}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
export default function ZRaporuPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [rapor, setRapor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRapor = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setRapor(null);

    try {
      const res = await api.get(`/reports/z-raporu?date=${date}`);
      setRapor(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Rapor alınamadı");
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  const handlePrint = () => window.print();

  const handleExport = async (type) => {
    try {
      const res = await api.get(`/export/${type}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export başarısız: " + (err?.response?.data?.message || err.message));
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
            <BarChart3 size={20} className="text-on-primary-container" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-on-surface">Raporlar & Z-Raporu</h1>
            <p className="text-xs text-on-surface-variant">Günlük kapanış, export ve işlem geçmişi</p>
          </div>
        </div>
      </div>

      {/* Export Kartları */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-5">
        <p className="text-sm font-semibold text-on-surface mb-4">📥 Veri Dışa Aktarma</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { type: "products", label: "Ürün Listesi", icon: Package },
            { type: "customers", label: "Müşteri Listesi", icon: FileText },
            { type: "debtors", label: "Borçlu Listesi", icon: Wallet },
            { type: "actionlogs", label: "İşlem Geçmişi", icon: TrendingUp },
          ].map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => handleExport(type)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-outline-variant hover:bg-primary-container hover:border-primary transition-all group"
            >
              <Download size={18} className="text-primary" />
              <Icon size={16} className="text-on-surface-variant group-hover:text-on-primary-container" />
              <span className="text-xs font-medium text-on-surface group-hover:text-on-primary-container text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Z-Raporu Sorgu Formu */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-5">
        <p className="text-sm font-semibold text-on-surface mb-4">📊 Gün Sonu (Z) Raporu</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Calendar size={16} className="text-on-surface-variant flex-shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <button
            onClick={fetchRapor}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Yükleniyor..." : "Raporu Getir"}
          </button>
          {rapor && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              <PrinterIcon size={15} />
              Yazdır
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">⚠ {error}</p>
        )}
      </div>

      {/* Z-Raporu Sonucu */}
      {rapor && (
        <div id="z-raporu-print" className="flex flex-col gap-4">
          {/* Özet Kartlar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={TrendingUp}
              label="Toplam Satış"
              value={formatCurrency(rapor.satis?.toplamSatis)}
              sub={`${rapor.satis?.toplamAdet || 0} işlem`}
              color="primary"
            />
            <StatCard
              icon={Wallet}
              label="Toplam Tahsilat"
              value={formatCurrency(rapor.tahsilat?.toplamTahsilat)}
              sub={`${rapor.tahsilat?.tahsilatAdet || 0} tahsilat`}
              color="green"
            />
            <StatCard
              icon={Package}
              label="Stok Girişi"
              value={`${rapor.stok?.giris || 0} adet`}
              color="blue"
            />
            <StatCard
              icon={Package}
              label="Stok Çıkışı"
              value={`${rapor.stok?.cikis || 0} adet`}
              color="orange"
            />
          </div>

          {/* İşlem Detayları */}
          {rapor.detay?.islemler?.length > 0 && (
            <div className="bg-surface rounded-2xl border border-outline-variant p-5">
              <p className="text-sm font-semibold text-on-surface mb-3">
                Satış İşlemleri ({rapor.detay.islemler.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-on-surface-variant">Tarih</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-on-surface-variant">Tür</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-on-surface-variant">Tutar</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-on-surface-variant">Peşinat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapor.detay.islemler.map((tx) => (
                      <tr key={tx.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                        <td className="py-2 px-3 text-on-surface-variant">{formatDate(tx.tarih)}</td>
                        <td className="py-2 px-3">{tx.islemTuru || "Satış"}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(tx.tutar)}</td>
                        <td className="py-2 px-3 text-right text-on-surface-variant">{formatCurrency(tx.pesinat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tahsilat Detayları */}
          {rapor.detay?.tahsilatlar?.length > 0 && (
            <div className="bg-surface rounded-2xl border border-outline-variant p-5">
              <p className="text-sm font-semibold text-on-surface mb-3">
                Tahsilat Kayıtları ({rapor.detay.tahsilatlar.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-on-surface-variant">Tarih</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-on-surface-variant">Ödeme Yöntemi</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-on-surface-variant">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapor.detay.tahsilatlar.map((c) => (
                      <tr key={c.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                        <td className="py-2 px-3 text-on-surface-variant">{formatDate(c.tarih)}</td>
                        <td className="py-2 px-3">{c.yontem || "Nakit"}</td>
                        <td className="py-2 px-3 text-right font-medium text-green-600">{formatCurrency(c.tutar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!rapor.detay?.islemler?.length && !rapor.detay?.tahsilatlar?.length && (
            <div className="bg-surface rounded-2xl border border-outline-variant p-8 text-center">
              <BarChart3 size={32} className="text-on-surface-variant mx-auto mb-2" />
              <p className="text-sm text-on-surface-variant">{rapor.tarih} tarihinde kayıt bulunamadı</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
