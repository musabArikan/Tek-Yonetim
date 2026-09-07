import { useState } from "react";
import { Lock, UserRound, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { login as loginService } from "../services/authService";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
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
        onLogin?.(response);
        navigate("/dashboard", { replace: true });
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <span className="text-xl font-semibold">TY</span>
          </div>
          <h1
            className="mt-6 text-3xl font-semibold text-slate-900"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Tek Yönetim
          </h1>
          <p className="mt-2 text-sm text-slate-600">Yönetim Paneli Girişi</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              E-posta
            </span>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-blue-400 focus-within:bg-white">
              <UserRound size={18} className="text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="orhan@gunesmagaza"
                autoComplete="username"
                className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Şifre
            </span>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-blue-400 focus-within:bg-white">
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </div>
          </label>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Yükleniyor..." : "Giriş Yap"}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
