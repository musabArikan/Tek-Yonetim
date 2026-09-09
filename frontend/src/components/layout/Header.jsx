import { useState } from "react";
import { Tag, PlusCircle, Menu, X, LogOut } from "lucide-react";

const navItems = [
  { id: "home", label: "Ana Sayfa" },
  { id: "stok", label: "Stok" },
  { id: "urun-stok", label: "Ürün & Stok" },
  { id: "envanter", label: "Emanetler" },
  { id: "borclular", label: "Borçlular" },
  { id: "transferler", label: "Transferler" },
  { id: "musteri-finans", label: "Finans & Senetler" },
  { id: "personeller", label: "Personeller" },
];

export default function Header({
  activePage,
  availablePages = navItems.map((item) => item.id),
  canCreateSale = false,
  role = "",
  onPageChange,
  onExistingSale,
  onNewCustomerSale,
  onLogout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <header className="bg-primary-container border-b border-outline-variant fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-16">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <div className="flex flex-col">
            <span
              className="text-lg md:text-2xl font-bold text-white whitespace-nowrap truncate"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              Tek Yönetim
            </span>
            {role ? (
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                {role}
              </span>
            ) : null}
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems
              .filter(({ id }) => availablePages.includes(id))
              .map(({ id, label }) => {
                const isActive = activePage === id;
                return (
                  <button
                    key={id}
                    onClick={() => handlePageChange(id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
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

        <div className="hidden md:flex items-center gap-4 shrink-0">
          {canCreateSale ? (
            <>
              <button
                onClick={onExistingSale}
                className="text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors rounded-lg px-6 py-2 flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Tag size={18} />
                Mevcut Müşteriye Satış
              </button>
              <button
                onClick={onNewCustomerSale}
                className="text-sm font-semibold bg-white/20 text-white hover:bg-white/30 transition-opacity rounded-lg px-6 py-2 flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <PlusCircle size={18} />
                Yeni Müşteri & Satış
              </button>
            </>
          ) : null}
          <button
            onClick={onLogout}
            className="text-sm font-semibold bg-red-600/90 text-white hover:bg-red-700 transition-colors rounded-lg px-4 py-2 flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        </div>

        <button
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-on-surface/40 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 bg-primary-container border-b border-white/20 z-40 md:hidden shadow-lg">
            {/* <div className="flex flex-col p-4 pb-2">
              <div className="flex flex-col">
                <span
                  className="text-xl font-bold text-white whitespace-nowrap truncate"
                  style={{ fontFamily: "var(--font-headline)" }}
                >
                  Tek Yönetim
                </span>
              </div>
            </div> */}
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
