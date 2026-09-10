import { useState } from "react";
import { Lock, UserRound, ArrowRight, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { login as loginService } from "../services/authService";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("staff"); // "staff" or "admin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await loginService(email, password);

      if (response?.token) {
        const role = response.role || "";
        const isManager = role === "admin" || role === "yonetici";

        if (activeTab === "admin" && !isManager) {
          setErrorMessage("Bu bölüm için yönetici yetkiniz yok");
          setIsLoading(false);
          return; // Stop login process
        }

        onLogin?.(response);

        // Yönlendirme mantığı
        if (isManager) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/musteriler", { replace: true });
        }
      } else {
        setErrorMessage("İşlem başarısız oldu. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Hata Detayı:", error);
      const message =
        error?.response?.data?.message || "E-posta veya şifre hatalı";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
          <span className="text-xl font-semibold tracking-wider">TY</span>
        </div>
        <h1
          className="mt-6 text-3xl font-bold text-slate-900 tracking-tight"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          Tek Yönetim
        </h1>
        <p className="mt-2 text-sm text-slate-500 font-medium uppercase tracking-widest">
          Saha ve Finans Yönetimi
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => {
              setActiveTab("staff");
              setErrorMessage("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === "staff"
                ? "bg-blue-50/50 text-blue-700 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Users size={18} />
            Personel Girişi
          </button>
          <button
            onClick={() => {
              setActiveTab("admin");
              setErrorMessage("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              activeTab === "admin"
                ? "bg-slate-800 text-white border-b-2 border-slate-900"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <ShieldCheck size={18} />
            Yönetici Girişi
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                E-posta Adresi
              </span>
              <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <UserRound size={18} className="text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={
                    activeTab === "admin"
                      ? "yonetici@tekyonetim.com"
                      : "personel@tekyonetim.com"
                  }
                  autoComplete="username"
                  className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Şifre
              </span>
              <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <Lock size={18} className="text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-start">
                <span className="block">{errorMessage}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${
                activeTab === "admin"
                  ? "bg-slate-800 hover:bg-slate-900"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Giriş Yapılıyor..." : "Sisteme Giriş Yap"}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
