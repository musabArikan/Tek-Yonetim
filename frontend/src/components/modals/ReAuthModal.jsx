import { useState } from "react";
import { Lock, X, Eye, EyeOff } from "lucide-react";
import { verifyPagePassword } from "../../services/reAuthService";

const PAGE_LABELS = {
  finans: "Müşteri Finans",
  stok: "Stok",
  raporlar: "Raporlar",
  envanter: "Envanter",
  transferler: "Transferler",
};

// sessionStorage key üretici
const sessionKey = (page) => `reauth_${page}_ok`;

/**
 * Sayfa şifresi kontrolünü session bazlı yapar.
 * Aynı oturumda bir kez onaylanan sayfa tekrar sorulmaz.
 */
export const isReAuthGranted = (page) => {
  try {
    return sessionStorage.getItem(sessionKey(page)) === "true";
  } catch {
    return false;
  }
};

export const grantReAuth = (page) => {
  try {
    sessionStorage.setItem(sessionKey(page), "true");
  } catch {
    // ignore
  }
};

export const revokeReAuth = (page) => {
  try {
    sessionStorage.removeItem(sessionKey(page));
  } catch {
    // ignore
  }
};

/**
 * ReAuthModal — şifreli sayfa koruması için modal.
 *
 * Props:
 *   page       : string — korunan sayfa adı ("finans", "stok" vb.)
 *   onGranted  : () => void — şifre doğrulanınca çağrılır
 *   onCancel   : () => void — iptal edilince çağrılır (ana sayfaya dön)
 */
export default function ReAuthModal({ page, onGranted, onCancel }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const label = PAGE_LABELS[page] || page;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Şifre boş olamaz");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await verifyPagePassword(page, password);
      if (result.authorized) {
        grantReAuth(page);
        onGranted();
      } else {
        setError("Şifre hatalı. Lütfen tekrar deneyin.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Doğrulama başarısız";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 bg-surface rounded-2xl shadow-2xl border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
              <Lock size={18} className="text-on-primary-container" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Şifreli Bölge</p>
              <p className="text-xs text-on-surface-variant">{label} sayfası korumalı</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
          >
            <X size={16} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">{label}</span> sayfasına
            erişmek için özel sayfayı şifresini girin.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">
              Sayfa Şifresi
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••"
                autoFocus
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 pr-10 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Doğrulanıyor..." : "Giriş"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
