import { useState } from "react";
import { Tag, PlusCircle, Menu, X, LogOut, Store, UserCheck } from "lucide-react";
import { getAuthSession } from "../../utils/authStorage";

const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "magazam", label: "Mağazam" },
  { id: "musteriler", label: "Müşteriler" },
  { id: "urun-stok", label: "Ürün & Stok" },
  { id: "envanter", label: "Emanetler" },
  { id: "musteri-finans", label: "Cari & Finans" },
  { id: "raporlar", label: "Raporlar" },
  { id: "personeller", label: "Personeller" },
];

export default function Header({
  activePage,
  availablePages = navItems.map((item) => item.id),
  canCreateSale = false,
  role = "",
  storeName = "",
  storeOwner = "",
  userName = "",
  onPageChange,
  onExistingSale,
  onNewCustomerSale,
  onLogout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const session = getAuthSession();
  const displayStoreName =
    storeName || session?.storeName || "Güneş Beyaz Eşya Mağazası";
  const displayOwnerName =
    storeOwner ||
    session?.storeOwner ||
    userName ||
    `${session?.ad || ""} ${session?.soyad || ""}`.trim() ||
    "Mağaza Yetkilisi";
  const displayUserName =
    userName || `${session?.ad || ""} ${session?.soyad || ""}`.trim();
  const displayRole = role || session?.role || "";

  const handlePageChange = (pageId) => {
    onPageChange(pageId);
    setMobileMenuOpen(false);
  };

  const handleExistingSale = () => {
    onExistingSale();
    setMobileMenuOpen(false);
  };

  const handleNewCustomerSale = () => {
    onNewCustomerSale();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-primary-container border-b border-outline-variant fixed top-0 left-0 w-full z-50 flex justify-between items-center px-3 lg:px-4 2xl:px-6 h-16 gap-2">
        <div className="flex items-center gap-2 lg:gap-3 2xl:gap-4 min-w-0 flex-1">
          <div className="flex flex-col min-w-0 shrink-0 max-w-[175px] sm:max-w-[210px] lg:max-w-[165px] 2xl:max-w-[235px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Store size={16} className="text-white/90 shrink-0 hidden sm:block" />
              <span
                className="text-sm 2xl:text-base font-bold text-white whitespace-nowrap truncate"
                style={{ fontFamily: "var(--font-headline)" }}
                title={displayStoreName}
              >
                {displayStoreName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] 2xl:text-[11px] font-medium text-white/80 truncate">
              <UserCheck size={11} className="shrink-0 text-white/70" />
              <span className="truncate" title={`Yetkili: ${displayOwnerName}`}>
                Yetkili: <strong className="text-white">{displayOwnerName}</strong>
              </span>
              {displayRole ? (
                <span className="uppercase tracking-wider text-[9px] bg-white/15 px-1 py-0.2 rounded text-white/90 shrink-0">
                  {displayRole}
                </span>
              ) : null}
            </div>
          </div>

          <div className="hidden lg:block h-7 w-px bg-white/15 shrink-0" />

          <nav className="hidden lg:flex items-center gap-0.5 2xl:gap-1 min-w-0 overflow-x-auto no-scrollbar">
            {navItems
              .filter(({ id }) => availablePages.includes(id))
              .map(({ id, label }) => {
                const isActive = activePage === id;
                return (
                  <button
                    key={id}
                    onClick={() => handlePageChange(id)}
                    className={`px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-[11px] xl:text-xs 2xl:text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-white/20 text-white shadow-2xs"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
          </nav>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 2xl:gap-2 shrink-0">
          {canCreateSale ? (
            <>
              <button
                onClick={onExistingSale}
                title="Mevcut Müşteriye Satış"
                className="text-[11px] xl:text-xs font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors rounded-lg px-2.5 2xl:px-3.5 py-1.5 flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Tag size={14} className="shrink-0" />
                <span>Mevcut Müşteriye Satış</span>
              </button>
              <button
                onClick={onNewCustomerSale}
                title="Yeni Müşteri & Satış"
                className="text-[11px] xl:text-xs font-semibold bg-white/20 text-white hover:bg-white/30 transition-opacity rounded-lg px-2.5 2xl:px-3.5 py-1.5 flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <PlusCircle size={14} className="shrink-0" />
                <span>Yeni Müşteri & Satış</span>
              </button>
            </>
          ) : null}
          <button
            onClick={onLogout}
            title={displayUserName ? `${displayUserName} oturumunu kapat` : "Çıkış Yap"}
            className="text-xs font-semibold bg-red-600/90 text-white hover:bg-red-700 transition-colors rounded-lg px-2.5 py-1.5 flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>

        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-on-surface/40 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 bg-primary-container border-b border-white/20 z-40 lg:hidden shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex flex-col px-4 pt-3 pb-2 border-b border-white/15">
              <span className="text-sm font-bold text-white truncate">
                {displayStoreName}
              </span>
              <span className="text-xs text-white/80">
                Yetkili: <strong className="text-white">{displayOwnerName}</strong>
                {displayUserName && displayUserName !== displayOwnerName
                  ? ` • Aktif: ${displayUserName}`
                  : ""}
              </span>
            </div>
            <nav className="flex flex-col p-4 pt-2 gap-1">
              {navItems
                .filter(({ id }) => availablePages.includes(id))
                .map(({ id, label }) => {
                  const isActive = activePage === id;
                  return (
                    <button
                      key={id}
                      onClick={() => handlePageChange(id)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
            </nav>
            <div className="flex flex-col gap-2 p-4 pt-0 border-t border-white/20">
              {canCreateSale ? (
                <>
                  <button
                    onClick={handleExistingSale}
                    className="w-full text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Tag size={17} />
                    Mevcut Müşteriye Satış
                  </button>
                  <button
                    onClick={handleNewCustomerSale}
                    className="w-full text-sm font-semibold bg-white/20 text-white hover:bg-white/30 transition-opacity rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle size={17} />
                    Yeni Müşteri & Satış
                  </button>
                </>
              ) : null}
              <button
                onClick={onLogout}
                className="w-full text-sm font-semibold bg-red-600/90 text-white hover:bg-red-700 transition-colors rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={17} />
                Çıkış Yap
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
