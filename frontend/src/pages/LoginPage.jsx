import { useState } from "react";
import {
  Lock,
  UserRound,
  ArrowRight,
  ShieldCheck,
  Users,
  Store,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  login as loginService,
  registerStore as registerStoreService,
  checkEmailAvailability,
} from "../services/authService";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [activeTab, setActiveTab] = useState("staff"); // "staff" or "admin"

  // Giriş state'leri
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Yeni Mağaza Kayıt (Sign-Up) state'leri
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [withDemoData, setWithDemoData] = useState(true);
  const [registerError, setRegisterError] = useState("");
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [emailSelectedFromSuggestion, setEmailSelectedFromSuggestion] = useState(false);

  const handleLoginSubmit = async (event) => {
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
          return;
        }

        onLogin?.(response);

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

  const handleEmailBlur = async () => {
    const trimmed = registerEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;

    try {
      const result = await checkEmailAvailability(trimmed, storeName);
      if (!result.available) {
        setRegisterError(
          result.message ||
            "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
        );
        setEmailSuggestions(result.suggestions || []);
        setEmailSelectedFromSuggestion(false);
      }
    } catch {
      // sessiz geç
    }
  };

  const handleSelectSuggestion = (suggestedEmail) => {
    setRegisterEmail(suggestedEmail);
    setRegisterError("");
    setEmailSuggestions([]);
    setEmailSelectedFromSuggestion(true);
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setRegisterError("");
    setEmailSuggestions([]);

    if (!storeName.trim() || !ownerName.trim() || !registerEmail.trim() || !registerPassword) {
      setRegisterError(
        "Mağaza adı, yetkili ad soyad, e-posta adresi ve şifre alanları zorunludur.",
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail.trim())) {
      setRegisterError("Lütfen geçerli bir e-posta adresi giriniz (örn: gunes@tekyonetim.com).");
      return;
    }

    if (String(registerPassword).length < 5) {
      setRegisterError("Şifre en az 5 karakter olmalıdır.");
      return;
    }

    setIsLoading(true);

    try {
      // Kayıt öncesi e-posta tekillik kontrolü
      const availability = await checkEmailAvailability(
        registerEmail.trim(),
        storeName.trim(),
      );
      if (!availability.available) {
        setRegisterError(
          availability.message ||
            "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
        );
        setEmailSuggestions(availability.suggestions || []);
        setEmailSelectedFromSuggestion(false);
        setIsLoading(false);
        return;
      }

      const response = await registerStoreService({
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        email: registerEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
        password: registerPassword,
        withDemoData,
      });

      if (response?.token) {
        toast.success(
          `${response.storeName || storeName.trim()} mağazası başarıyla oluşturuldu!`,
        );
        onLogin?.(response);
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Kayıt Hatası:", error);
      const message =
        error?.response?.data?.message ||
        "Mağaza kaydı oluşturulamadı. Lütfen bilgileri kontrol edin.";
      const suggestions = error?.response?.data?.suggestions || [];
      setRegisterError(message);
      setEmailSuggestions(suggestions);
      setEmailSelectedFromSuggestion(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
          <span className="text-xl font-semibold tracking-wider">TY</span>
        </div>
        <h1
          className="mt-4 text-3xl font-bold text-slate-900 tracking-tight"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          Tek Yönetim
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 font-medium uppercase tracking-widest">
          Saha ve Finans Yönetimi • SaaS Mağaza Platformu
        </p>
      </div>

      <div
        className={`w-full ${
          authMode === "register" ? "max-w-xl" : "max-w-md"
        } rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all`}
      >
        {/* Ana Sekmeler: Giriş Yap / Yeni Mağaza Oluştur (Kayıt Ol) */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setErrorMessage("");
              setRegisterError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-sm font-semibold transition-all cursor-pointer ${
              authMode === "login"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <LogIn size={17} />
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("register");
              setErrorMessage("");
              setRegisterError("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-sm font-semibold transition-all cursor-pointer ${
              authMode === "register"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <UserPlus size={17} />
            Yeni Mağaza Oluştur (Kayıt Ol)
          </button>
        </div>

        {authMode === "login" ? (
          <>
            {/* Giriş Alt Sekmeleri: Personel / Yönetici */}
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("staff");
                  setErrorMessage("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === "staff"
                    ? "bg-blue-50/60 text-blue-700 border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Users size={16} />
                Personel Girişi
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("admin");
                  setErrorMessage("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === "admin"
                    ? "bg-slate-800 text-white border-b-2 border-slate-900"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ShieldCheck size={16} />
                Yönetici Girişi
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={handleLoginSubmit} className="space-y-5">
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
                          ? "ahmet.yilmaz@tekyonetim.com"
                          : "mehmet.kaya@tekyonetim.com"
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
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-start gap-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
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
          </>
        ) : (
          /* Yeni Mağaza Oluştur (Kayıt Ol) Formu */
          <div className="p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Yeni Mağaza Hesabı Oluşturun
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kendi beyaz eşya mağazanızı saniyeler içinde açın ve hemen yönetmeye başlayın.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Mağaza Adı <span className="text-red-500">*</span>
                  </span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <Store size={17} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Örn: Güneş Beyaz Eşya"
                      className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Yetkili Ad Soyad <span className="text-red-500">*</span>
                  </span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <UserRound size={17} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Örn: Ahmet Yılmaz"
                      className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  E-Posta Adresi (Giriş İçin Kullanılacak){" "}
                  <span className="text-red-500">*</span>
                </span>
                <div
                  className={`flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 transition focus-within:ring-1 ${
                    emailSuggestions.length > 0
                      ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500"
                      : emailSelectedFromSuggestion
                        ? "border-emerald-400 focus-within:border-emerald-500 focus-within:ring-emerald-500"
                        : "border-slate-300 focus-within:border-blue-500 focus-within:ring-blue-500"
                  }`}
                >
                  <Mail size={17} className="text-slate-400 shrink-0" />
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => {
                      setRegisterEmail(e.target.value);
                      setRegisterError("");
                      setEmailSuggestions([]);
                      setEmailSelectedFromSuggestion(false);
                    }}
                    onBlur={handleEmailBlur}
                    placeholder="Örn: gunes@tekyonetim.com veya ahmet@gunesmagaza.com"
                    className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                {emailSelectedFromSuggestion && !registerError ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <CheckCircle2 size={14} />
                    Seçilen e-posta adresi kullanılabilir.
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Personel eklerken bu e-postadaki <strong>@domain.com</strong> uzantınız otomatik olarak kullanılır.
                  </p>
                )}
              </label>

              {/* E-Posta Tekillik Hatası ve Tıklanabilir Alternatif Öneriler */}
              {registerError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
                    <span className="font-medium">{registerError}</span>
                  </div>

                  {emailSuggestions.length > 0 ? (
                    <div className="pt-1 border-t border-red-200/70">
                      <p className="text-xs font-semibold text-slate-700 mb-2">
                        Kullanabileceğiniz alternatif e-posta önerileri (seçmek için tıklayın):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {emailSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-xs transition hover:bg-blue-600 hover:text-white hover:border-blue-600 cursor-pointer"
                          >
                            <Sparkles size={13} />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Telefon
                  </span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <Phone size={17} className="text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Örn: 0312 555 01 01"
                      className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Şifre <span className="text-red-500">*</span>
                  </span>
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <Lock size={17} className="text-slate-400 shrink-0" />
                    <input
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="En az 5 karakter"
                      autoComplete="new-password"
                      className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Mağaza Adresi
                </span>
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <MapPin size={17} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Örn: Kızılay Mah. Atatürk Bulvarı No:112, Çankaya / Ankara"
                    className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              {/* Demo Veri Seçeneği Checkbox */}
              <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={withDemoData}
                  onChange={(e) => setWithDemoData(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-blue-600 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    Örnek ürün, müşteri ve işlem verileriyle başlat
                  </span>
                  <span className="text-slate-600 mt-0.5 block">
                    Sistemi hemen test edebilmeniz için hazır beyaz eşya ürünleri, müşteriler ve satış kayıtları yüklenir. Boş mağaza ile başlamak için işareti kaldırabilirsiniz.
                  </span>
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? "Mağaza Oluşturuluyor..." : "Mağazayı Oluştur ve Başla"}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
