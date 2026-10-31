import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  TrendingUp,
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
  Table,
} from "lucide-react";
import { exportData, getReportTableData } from "../services/reportService";

const MONTH_NAMES = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const REPORT_TYPES = [
  {
    type: "products",
    label: "Ürün Listesi",
    description: "Stoktaki tüm ürünler, markalar, alış/satış fiyatları ve stok miktarları",
    icon: Package,
    badgeColor: "bg-blue-50 text-blue-700",
  },
  {
    type: "customers",
    label: "Müşteri Listesi",
    description: "Kayıtlı tüm müşteriler, iletişim bilgileri ve cari bakiyeleri",
    icon: FileText,
    badgeColor: "bg-indigo-50 text-indigo-700",
  },
  {
    type: "debtors",
    label: "Borçlular Listesi",
    description: "Güncel borcu bulunan müşteriler ve kalan alacak tutarları",
    icon: Wallet,
    badgeColor: "bg-red-50 text-red-700",
  },
  {
    type: "transactions",
    label: "İşlem Geçmişi",
    description: "Seçilen aya ait tüm satış ve tahsilat hareketleri",
    icon: TrendingUp,
    badgeColor: "bg-emerald-50 text-emerald-700",
  },
];

const formatCellValue = (columnName, value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number" && columnName.includes("(₺)")) {
    return `${value.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₺`;
  }
  return String(value);
};

export default function ZRaporuPage() {
  const now = useMemo(() => new Date(), []);
  const [selectedReport, setSelectedReport] = useState("products");
  const [selectedYear, setSelectedYear] = useState(() => now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => now.getMonth() + 1); // 1..12

  const [reportData, setReportData] = useState({
    sheetName: "Ürün Listesi",
    fileName: "urun-listesi.xlsx",
    rows: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isMonthlyReport = selectedReport === "transactions";

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = isMonthlyReport
        ? { year: selectedYear, month: selectedMonth }
        : {};
      const data = await getReportTableData(selectedReport, params);
      setReportData(
        data || {
          sheetName: "",
          fileName: "",
          rows: [],
        },
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Rapor verileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedReport, isMonthlyReport, selectedYear, selectedMonth]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleExport = async (format = "xlsx") => {
    setIsExporting(true);
    try {
      const params = isMonthlyReport
        ? { year: selectedYear, month: selectedMonth }
        : {};
      const { blob, fileName } = await exportData(selectedReport, params, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || `${selectedReport}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `${reportData.sheetName || "Rapor"} (${format.toUpperCase()}) başarıyla indirildi.`,
      );
    } catch (err) {
      toast.error(
        "Dışa aktarma başarısız: " + (err?.response?.data?.message || err.message),
      );
    } finally {
      setIsExporting(false);
    }
  };

  const columns = useMemo(() => {
    if (!reportData.rows || reportData.rows.length === 0) return [];
    return Object.keys(reportData.rows[0]);
  }, [reportData.rows]);

  const filteredRows = useMemo(() => {
    const rows = Array.isArray(reportData.rows) ? reportData.rows : [];
    const q = searchQuery.toLocaleLowerCase("tr-TR").trim();
    if (!q) return rows;
    return rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "")
          .toLocaleLowerCase("tr-TR")
          .includes(q),
      ),
    );
  }, [reportData.rows, searchQuery]);

  const activeReportMeta =
    REPORT_TYPES.find((r) => r.type === selectedReport) || REPORT_TYPES[0];

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      {/* Sayfa Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Mağaza Raporları & Veri Dışa Aktarma
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Raporları uygulama içinde tablo olarak inceleyin veya Excel / CSV olarak indirin
            </p>
          </div>
        </div>
      </div>

      {/* Rapor Seçim Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map(({ type, label, description, icon: Icon, badgeColor }) => {
          const isSelected = selectedReport === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSelectedReport(type);
                setSearchQuery("");
              }}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? "bg-blue-50/60 border-blue-600 ring-2 ring-blue-500/20 shadow-xs"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? "bg-blue-600 text-white" : badgeColor
                  }`}
                >
                  <Icon size={20} />
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isSelected ? "Aktif Rapor" : "Tabloyu Aç"}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Seçili Raporun Uygulama İçi Tablosu + Ay/Yıl Seçici + Dışa Aktar Butonları */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Tablo Üst Barı */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
              <Table size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {activeReportMeta.label}
                  {isMonthlyReport
                    ? ` — ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                    : ""}
                </h2>
                <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
                  {filteredRows.length} Kayıt
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeReportMeta.description}
              </p>
            </div>
          </div>

          {/* Sağ Üst Kontroller: Ay/Yıl Takvim Seçici (İşlem Geçmişi için) + Arama + Dışa Aktar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* İşlem Geçmişi Aylık Filtre: Ay/Yıl Takvim Seçici */}
            {isMonthlyReport && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Önceki Ay"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1.5 px-1.5">
                  <Calendar size={14} className="text-blue-600 shrink-0" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    aria-label="Rapor Ay Seçimi"
                    className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    aria-label="Rapor Yıl Seçimi"
                    className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Sonraki Ay"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Tablo İçi Arama */}
            <div className="relative min-w-[200px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tabloda ara..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Dışa Aktar (Excel / CSV) Butonları */}
            <button
              type="button"
              disabled={isExporting || filteredRows.length === 0}
              onClick={() => handleExport("xlsx")}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              Dışa Aktar (Excel)
            </button>
            <button
              type="button"
              disabled={isExporting || filteredRows.length === 0}
              onClick={() => handleExport("csv")}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={15} className="text-blue-600" />
              CSV İndir
            </button>
          </div>
        </div>

        {/* Rapor Tablosu Gövdesi */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            Rapor tablosu hazırlanıyor...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16 px-4 text-slate-400">
            <BarChart3 size={38} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-slate-600">
              {isMonthlyReport
                ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} döneminde kayıtlı işlem bulunamadı.`
                : "Bu raporda görüntülenecek kayıt bulunamadı."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  {columns.map((col) => {
                    const isCurrencyCol = col.includes("(₺)");
                    return (
                      <th
                        key={col}
                        className={`px-4 py-3.5 font-semibold whitespace-nowrap ${
                          isCurrencyCol ? "text-right" : "text-left"
                        }`}
                      >
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {columns.map((col) => {
                      const isCurrencyCol = col.includes("(₺)");
                      const rawVal = row[col];
                      return (
                        <td
                          key={col}
                          className={`px-4 py-3 text-xs sm:text-sm ${
                            isCurrencyCol
                              ? "text-right font-bold text-slate-900 whitespace-nowrap"
                              : "text-slate-700"
                          }`}
                        >
                          {formatCellValue(col, rawVal)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
