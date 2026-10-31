import { useState } from "react";
import { Tag, PlusCircle, Menu, X, LogOut, Store, UserCheck } from "lucide-react";
import { getAuthSession } from "../../utils/authStorage";

const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "musteriler", label: "Müşteriler" },
  { id: "stok", label: "Stok" },
  { id: "urun-stok", label: "Ürün & Stok" },
  { id: "envanter", label: "Emanetler" },
  { id: "transferler", label: "Transferler" },
  { id: "musteri-finans", label: "Finans & Senetler" },
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
      <header className="bg-primary-container border-b border-outline-variant fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-16 gap-3">
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Store size={18} className="text-white/90 shrink-0 hidden sm:block" />
              <span
                className="text-base md:text-lg font-bold text-white whitespace-nowrap truncate max-w-[200px] sm:max-w-[260px] lg:max-w-[320px]"
                style={{ fontFamily: "var(--font-headline)" }}
                title={displayStoreName}
              >
                {displayStoreName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/80 truncate">
              <UserCheck size={12} className="shrink-0 text-white/70" />
              <span className="truncate" title={`Yetkili: ${displayOwnerName}`}>
                Yetkili: <strong className="text-white">{displayOwnerName}</strong>
              </span>
              {displayRole ? (
                <span className="uppercase tracking-wider text-[10px] bg-white/15 px-1.5 py-0.2 rounded text-white/90 shrink-0">
                  {displayRole}
                </span>
              ) : null}
            </div>
          </div>

          <nav className="hidden xl:flex items-center gap-1">
            {navItems
              .filter(({ id }) => availablePages.includes(id))
              .map(({ id, label }) => {
                const isActive = activePage === id;
                return (
                  <button
                    key={id}
                    onClick={() => handlePageChange(id)}
                    className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
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
        </div>

        <div className="hidden xl:flex items-center gap-2.5 shrink-0">
          {canCreateSale ? (
            <>
              <button
                onClick={onExistingSale}
                className="text-xs lg:text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors rounded-lg px-4 py-2 flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Tag size={16} />
                Mevcut Müşteriye Satış
              </button>
              <button
                onClick={onNewCustomerSale}
                className="text-xs lg:text-sm font-semibold bg-white/20 text-white hover:bg-white/30 transition-opacity rounded-lg px-4 py-2 flex items-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <PlusCircle size={16} />
                Yeni Müşteri & Satış
              </button>
            </>
          ) : null}
          <button
            onClick={onLogout}
            title={displayUserName ? `${displayUserName} oturumunu kapat` : "Çıkış Yap"}
            className="text-sm font-semibold bg-red-600/90 text-white hover:bg-red-700 transition-colors rounded-lg px-3.5 py-2 flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <LogOut size={17} />
          </button>
        </div>

        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="xl:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-on-surface/40 z-40 xl:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 bg-primary-container border-b border-white/20 z-40 xl:hidden shadow-lg">
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
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
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
                    className="w-full text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors rounded-lg px-4 py-3 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Tag size={18} />
                    Mevcut Müşteriye Satış
                  </button>
                  <button
                    onClick={handleNewCustomerSale}
                    className="w-full text-sm font-semibold bg-white/20 text-white hover:bg-white/30 transition-opacity rounded-lg px-4 py-3 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle size={18} />
                    Yeni Müşteri & Satış
                  </button>
                </>
              ) : null}
              <button
                onClick={onLogout}
                className="w-full text-sm font-semibold bg-red-600/90 text-white hover:bg-red-700 transition-colors rounded-lg px-4 py-3 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
