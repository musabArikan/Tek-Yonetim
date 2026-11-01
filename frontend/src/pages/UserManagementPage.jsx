import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Pencil,
  PlusCircle,
  Trash2,
  Users,
  Lock,
  AtSign,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  LayoutGrid,
} from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../components/modals/Modal";
import { FormField, TextInput, SelectInput } from "../components/ui/FormField";
import {
  deleteUser,
  getUsers,
  createUser,
  updateUser,
  changePassword,
} from "../services/userService";
import { checkEmailAvailability } from "../services/authService";
import { setUserPagePassword } from "../services/reAuthService";
import { getAuthSession } from "../utils/authStorage";
import { localDb } from "../utils/localDb";
import {
  PAGE_ACCESS_OPTIONS,
  DEFAULT_STAFF_ALLOWED_PAGES,
  normalizeAllowedPages,
  allowedPagesToPageLocks,
} from "../utils/rbac";

const roleOptions = [
  { value: "yonetici", label: "Yönetici" },
  { value: "kasiyer", label: "Kasiyer" },
  { value: "depo_sorumlusu", label: "Depo Sorumlusu" },
  { value: "personel", label: "Personel" },
  { value: "admin", label: "Mağaza Yetkilisi (Admin)" },
];

const permissionOptions = [
  { key: "musteriSilebilir", label: "Kayıt Silebilir" },
  { key: "tahsilatAlabilir", label: "Tahsilat Alabilir" },
  { key: "satisYapabilir", label: "Satış Yapabilir" },
  { key: "stokDuzenleyebilir", label: "Stok Düzenleyebilir" },
  { key: "envanterDuzenleyebilir", label: "Envanter Düzenleyebilir" },
  { key: "zRaporuAlabilir", label: "Z-Raporu Alabilir" },
  { key: "excelExportEdebilir", label: "Excel Export Alabilir" },
];

const emptyFlags = (items) =>
  items.reduce((acc, item) => ({ ...acc, [item.key]: false }), {});

const emptyForm = {
  ad: "",
  soyad: "",
  email: "",
  password: "",
  role: "kasiyer",
  permissions: emptyFlags(permissionOptions),
  allowedPages: { ...DEFAULT_STAFF_ALLOWED_PAGES },
};

const extractDomainFromEmail = (emailStr = "") => {
  const clean = String(emailStr || "").trim().toLowerCase();
  const parts = clean.split("@");
  return parts.length > 1 && parts[1] ? parts[1] : "tekyonetim.com";
};

const slugifyTr = (value = "") =>
  String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9._-]/g, "")
    .trim();

const normalizeUser = (user) => {
  const role = user.role || "personel";
  const allowedPages = normalizeAllowedPages(user.allowedPages, {
    role,
    pageLocks: user.pageLocks,
  });
  return {
    id: user._id || user.id,
    ad: user.ad || "",
    soyad: user.soyad || "",
    email: user.email || "",
    role,
    permissions: user.permissions || emptyFlags(permissionOptions),
    allowedPages,
    pageLocks: allowedPagesToPageLocks(allowedPages),
  };
};

const roleLabelMap = Object.fromEntries(
  roleOptions.map((item) => [item.value, item.label]),
);

const SectionTitle = ({ title, description }) => (
  <div>
    <p className="text-sm font-semibold text-on-surface">{title}</p>
    <p className="text-xs text-on-surface-variant">{description}</p>
  </div>
);

export default function UserManagementPage({
  currentUserId,
  currentUserEmail,
  onSessionRefresh,
}) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");

  // Mağaza kurucusunun kilitli e-posta uzantısı (@domain.com)
  const activeDomain = useMemo(() => {
    try {
      const storeProfile = localDb.stores.getProfile();
      if (storeProfile?.mailDomain) {
        return String(storeProfile.mailDomain).trim().toLowerCase();
      }
      if (storeProfile?.kurucuEmail) {
        return extractDomainFromEmail(storeProfile.kurucuEmail);
      }
    } catch {
      // ignore
    }
    const sessionEmail = currentUserEmail || getAuthSession()?.email || "";
    return extractDomainFromEmail(sessionEmail);
  }, [currentUserEmail]);

  const [emailUsername, setEmailUsername] = useState("");
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [emailAvailableConfirmed, setEmailAvailableConfirmed] = useState(false);

  // Şifre değiştirme modal state'leri
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Sayfa Şifreleri modal state'leri
  const [isPagePasswordModalOpen, setIsPagePasswordModalOpen] = useState(false);
  const [pagePasswordTargetUser, setPagePasswordTargetUser] = useState(null);
  const [pagePasswordInputs, setPagePasswordInputs] = useState({
    finans: "",
    stok: "",
    raporlar: "",
    envanter: "",
  });
  const [isSavingPagePassword, setIsSavingPagePassword] = useState({});

  const PAGE_LABELS = {
    finans: "Cari & Finans",
    stok: "Ürün & Stok",
    raporlar: "Raporlar",
    envanter: "Emanetler",
  };

  const modalTitle = editingUser ? "Personel Düzenle" : "Yeni Personel Ekle";

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await getUsers();
      setUsers((Array.isArray(response) ? response : []).map(normalizeUser));
    } catch (error) {
      console.error("Hata Detayı:", error);
      setErrorMessage(
        error?.response?.data?.message || "Personeller yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (a.role !== "admin" && b.role === "admin") return 1;
        return `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, "tr");
      }),
    [users],
  );

  // Kullanıcı adı ve kilitli mağaza domain birleşiminden tam e-posta adresini senkron tut
  const combinedEmail = useMemo(() => {
    const cleanUser = emailUsername.trim().toLowerCase();
    if (!cleanUser) return "";
    return `${cleanUser}@${activeDomain}`;
  }, [emailUsername, activeDomain]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, email: combinedEmail }));
  }, [combinedEmail]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      permissions: emptyFlags(permissionOptions),
      // Yeni personel eklenirken Mağazam ve Personeller erişimi varsayılan olarak kapalı (işaretsiz) gelir
      allowedPages: { ...DEFAULT_STAFF_ALLOWED_PAGES },
    });
    setEmailUsername("");
    setEmailSuggestions([]);
    setEmailAvailableConfirmed(false);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    const [localPart = ""] = String(user.email || "").split("@");
    setEmailUsername(localPart);
    setEmailSuggestions([]);
    setEmailAvailableConfirmed(false);
    setForm({
      ad: user.ad,
      soyad: user.soyad,
      email: `${localPart}@${activeDomain}`,
      password: "",
      role: user.role,
      permissions: { ...emptyFlags(permissionOptions), ...user.permissions },
      allowedPages: normalizeAllowedPages(user.allowedPages, {
        role: user.role,
        pageLocks: user.pageLocks,
      }),
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
    setEmailUsername("");
    setEmailSuggestions([]);
    setEmailAvailableConfirmed(false);
    setFormError("");
  };

  // Şifre modalı yardımcıları
  const openPasswordModal = (user) => {
    setPasswordTargetUser(user);
    setNewPassword("");
    setPasswordError("");
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordTargetUser(null);
    setNewPassword("");
    setPasswordError("");
  };

  // Sayfa şifresi modal yardımcıları
  const openPagePasswordModal = (user) => {
    setPagePasswordTargetUser(user);
    setPagePasswordInputs({
      finans: "",
      stok: "",
      raporlar: "",
      envanter: "",
    });
    setIsPagePasswordModalOpen(true);
  };

  const closePagePasswordModal = () => {
    setIsPagePasswordModalOpen(false);
    setPagePasswordTargetUser(null);
  };

  const handleSetPagePassword = async (page) => {
    const pwd = pagePasswordInputs[page];
    setIsSavingPagePassword((prev) => ({ ...prev, [page]: true }));
    try {
      await setUserPagePassword(pagePasswordTargetUser.id, page, pwd);
      toast.success(
        pwd
          ? `${PAGE_LABELS[page]} sayfası şifresi güncellendi`
          : `${PAGE_LABELS[page]} sayfası şifresi kaldırıldı`,
      );
      setPagePasswordInputs((prev) => ({ ...prev, [page]: "" }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Sayfa şifresi güncellenemedi");
    } finally {
      setIsSavingPagePassword((prev) => ({ ...prev, [page]: false }));
    }
  };

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  };

  const handleEmailUsernameChange = (event) => {
    const rawValue = event.target.value;
    setFormError("");
    setEmailSuggestions([]);
    setEmailAvailableConfirmed(false);

    // Kullanıcı tam e-posta yapıştırırsa (@ içeriyorsa) sadece @ öncesindeki kullanıcı adını al, uzantı kilitlidir
    if (rawValue.includes("@")) {
      const [localPart] = rawValue.split("@");
      setEmailUsername(slugifyTr(localPart));
      return;
    }

    setEmailUsername(slugifyTr(rawValue));
  };

  const handleCheckStaffEmail = async () => {
    if (!combinedEmail || !combinedEmail.includes("@")) return;
    try {
      const result = await checkEmailAvailability(
        combinedEmail,
        form.soyad,
        editingUser?.id || null,
      );
      if (!result.available) {
        setFormError(
          result.message ||
            "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
        );
        setEmailSuggestions(result.suggestions || []);
        setEmailAvailableConfirmed(false);
      }
    } catch {
      // sessiz geç
    }
  };

  const handleSelectEmailSuggestion = (suggestedEmail) => {
    const [localPart = ""] = String(suggestedEmail).split("@");
    setEmailUsername(localPart);
    setFormError("");
    setEmailSuggestions([]);
    setEmailAvailableConfirmed(true);
  };

  const handleFlagChange = (section, key) => (event) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: event.target.checked,
      },
    }));
  };

  const buildPayload = () => ({
    ad: form.ad.trim(),
    soyad: form.soyad.trim(),
    email: combinedEmail.trim(),
    ...(editingUser ? {} : { password: form.password }),
    role: form.role,
    permissions: form.permissions,
    allowedPages: form.allowedPages,
    pageLocks: allowedPagesToPageLocks(form.allowedPages),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setEmailSuggestions([]);

    if (!form.ad.trim() || !form.soyad.trim() || !emailUsername.trim()) {
      setFormError("Ad, soyad ve e-posta kullanıcı adı alanları zorunludur.");
      return;
    }

    const hasAtLeastOnePage = Object.values(form.allowedPages || {}).some(Boolean);
    if (!hasAtLeastOnePage) {
      setFormError("Personelin erişebileceği en az 1 sayfa seçmelisiniz.");
      return;
    }

    if (!editingUser && !form.password.trim()) {
      setFormError("Yeni personel oluştururken şifre zorunludur.");
      return;
    }

    if (!editingUser && form.password.trim().length < 5) {
      setFormError("Şifre en az 5 karakter olmalıdır.");
      return;
    }

    setIsSaving(true);

    try {
      // Kayıt öncesi e-posta tekillik kontrolü
      const availability = await checkEmailAvailability(
        combinedEmail,
        form.soyad,
        editingUser?.id || null,
      );
      if (!availability.available) {
        setFormError(
          availability.message ||
            "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
        );
        setEmailSuggestions(availability.suggestions || []);
        setEmailAvailableConfirmed(false);
        setIsSaving(false);
        return;
      }

      const payload = buildPayload();
      const response = editingUser
        ? await updateUser(editingUser.id, payload)
        : await createUser(payload);

      toast.success(
        editingUser
          ? "Personel bilgileri ve sayfa yetkileri güncellendi."
          : `Yeni personel (${combinedEmail}) oluşturuldu.`,
      );

      closeModal();
      await loadUsers();

      if (response && response._id === currentUserId) {
        onSessionRefresh?.(response);
      }
    } catch (error) {
      console.error("Hata Detayı:", error);
      setFormError(
        error?.response?.data?.message || "Personel kaydı tamamlanamadı.",
      );
      setEmailSuggestions(error?.response?.data?.suggestions || []);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (!newPassword.trim() || newPassword.trim().length < 5) {
      setPasswordError("Şifre en az 5 karakter olmalıdır.");
      return;
    }

    setIsSavingPassword(true);

    try {
      await changePassword(passwordTargetUser.id, newPassword.trim());
      toast.success(
        `${passwordTargetUser.ad} ${passwordTargetUser.soyad} için şifre güncellendi.`,
      );
      closePasswordModal();
    } catch (error) {
      console.error("Hata Detayı:", error);
      setPasswordError(
        error?.response?.data?.message || "Şifre güncellenemedi.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDelete = async (user) => {
    const isConfirmed = window.confirm(
      `${user.ad} ${user.soyad} personelini silmek istiyor musunuz?`,
    );

    if (!isConfirmed) {
      return;
    }

    setDeletingUserId(user.id);
    setErrorMessage("");

    try {
      await deleteUser(user.id);
      toast.success("Personel silindi.");
      await loadUsers();
    } catch (error) {
      console.error("Hata Detayı:", error);
      setErrorMessage(
        error?.response?.data?.message || "Personel silinemedi.",
      );
    } finally {
      setDeletingUserId("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2
            className="text-2xl font-semibold text-on-surface"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Personeller
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            İşletmenize bağlı kullanıcıları ve sayfa erişim yetkilerini yönetin. Sabit mağaza e-posta uzantınız:{" "}
            <span className="inline-flex items-center gap-1 font-semibold text-primary-container">
              <Lock size={12} />@{activeDomain}
            </span>
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
        >
          <PlusCircle size={18} />
          Yeni Personel
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-6 text-sm text-on-surface-variant">
          Personeller yükleniyor...
        </div>
      ) : null}

      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {sortedUsers.length === 0 ? (
            <p className="py-16 text-center text-sm text-on-surface-variant">
              Henüz kayıtlı personel bulunmuyor.
            </p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant">
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Personel
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    E-posta
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Rol
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    Erişebildiği Sayfalar
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant">
                    İşlem Yetkileri
                  </th>
                  <th className="p-4 text-xs font-semibold text-on-surface-variant text-right">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const enabledPermissions = permissionOptions.filter(
                    (item) => user.permissions?.[item.key],
                  );
                  const enabledPages = PAGE_ACCESS_OPTIONS.filter(
                    (item) => user.allowedPages?.[item.key],
                  );

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-outline-variant hover:bg-surface-container transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">
                            <Users size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-on-surface">
                              {user.ad} {user.soyad}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              {isSelf ? "Aktif oturum (Mağaza Yetkilisi)" : "Personel hesabı"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-on-surface font-medium">{user.email}</td>
                      <td className="p-4 text-sm text-on-surface">
                        {roleLabelMap[user.role] || user.role}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {enabledPages.map((page) => (
                            <span
                              key={page.key}
                              className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-800"
                            >
                              {page.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {enabledPermissions.length > 0 ? (
                            enabledPermissions.map((item) => (
                              <span
                                key={item.key}
                                className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-on-surface"
                              >
                                {item.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-on-surface-variant">
                              Standart görüntüleme
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => openPagePasswordModal(user)}
                              title="Sayfa Şifreleri"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface cursor-pointer"
                            >
                              <Lock size={14} />
                              Sayfa Kilidi
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => openPasswordModal(user)}
                              title="Şifre Değiştir"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface cursor-pointer"
                            >
                              <KeyRound size={14} />
                              Şifre
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            disabled={isSelf}
                            title={isSelf ? "Kendi hesabınızı düzenleyemezsiniz" : "Düzenle"}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Pencil size={14} />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={isSelf || deletingUserId === user.id}
                            title={isSelf ? "Kendi hesabınızı silemezsiniz" : "Sil"}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={14} />
                            {deletingUserId === user.id ? "Siliniyor..." : "Sil"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Personel Ekle / Düzenle Modalı */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalTitle} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Ad" required>
              <TextInput
                value={form.ad}
                onChange={handleFieldChange("ad")}
                placeholder="Örn: Mehmet"
              />
            </FormField>
            <FormField label="Soyad" required>
              <TextInput
                value={form.soyad}
                onChange={handleFieldChange("soyad")}
                placeholder="Örn: Kaya"
              />
            </FormField>

            {/* Kilitli Mağaza Uzantılı E-posta Alanı */}
            <div className="md:col-span-2">
              <FormField label="Personel E-posta Adresi (Sabit Mağaza Uzantılı)" required>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-stretch rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <input
                      type="text"
                      value={emailUsername}
                      onChange={handleEmailUsernameChange}
                      onBlur={handleCheckStaffEmail}
                      placeholder={
                        form.ad
                          ? `örn: ${slugifyTr(form.ad)}`
                          : "örn: mehmet"
                      }
                      className="flex-1 min-w-0 border-0 bg-transparent px-3.5 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
                    />
                    <div
                      title="Mağaza e-posta uzantısı sabittir ve değiştirilemez"
                      className="flex items-center border-l border-outline-variant bg-slate-100 px-3.5 py-1.5 gap-1.5 select-none cursor-not-allowed"
                    >
                      <AtSign size={14} className="text-primary-container shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-primary-container">
                        {activeDomain}
                      </span>
                      <Lock size={13} className="text-slate-500 ml-1 shrink-0" />
                    </div>
                  </div>

                  {/* Otomatik birleşen tam e-posta önizlemesi ve hızlı isim önerisi */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-on-surface-variant">
                      Giriş E-postası:{" "}
                      <span className="font-semibold text-on-surface">
                        {combinedEmail || `kullanici@${activeDomain}`}
                      </span>
                    </div>

                    {form.ad.trim() && !emailUsername && (
                      <button
                        type="button"
                        onClick={() => {
                          const suggestedLocal = form.soyad.trim()
                            ? `${slugifyTr(form.ad)}.${slugifyTr(form.soyad)}`
                            : slugifyTr(form.ad);
                          setEmailUsername(suggestedLocal);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-container hover:underline cursor-pointer"
                      >
                        <Sparkles size={12} />
                        &ldquo;{slugifyTr(form.ad)}@{activeDomain}&rdquo; olarak doldur
                      </button>
                    )}
                  </div>

                  {emailAvailableConfirmed && !formError ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <CheckCircle2 size={14} />
                      Seçilen e-posta adresi kullanılabilir.
                    </p>
                  ) : null}
                </div>
              </FormField>
            </div>

            <FormField label="Rol Seçimi" required>
              <SelectInput value={form.role} onChange={handleFieldChange("role")}>
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            {/* Şifre yalnızca yeni personel eklerken gösterilir */}
            {!editingUser ? (
              <FormField label="Şifre" required>
                <TextInput
                  type="password"
                  value={form.password}
                  onChange={handleFieldChange("password")}
                  placeholder="En az 5 karakter"
                />
              </FormField>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sayfa Bazlı Erişim Yetkileri */}
            <div className="rounded-xl border border-outline-variant bg-surface p-4">
              <SectionTitle
                title="Erişebileceği Sayfalar (Menü & Ekran Yetkisi)"
                description="Personelin üst menüde görebileceği ve girebileceği sayfaları seçin."
              />
              <div className="mt-4 space-y-2.5">
                {PAGE_ACCESS_OPTIONS.map((item) => {
                  const isChecked = Boolean(form.allowedPages?.[item.key]);
                  const isSensitive =
                    item.key === "magazam" || item.key === "personeller";
                  return (
                    <label
                      key={item.key}
                      className={`flex items-center justify-between gap-4 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                        isChecked
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-outline-variant bg-surface-container-lowest"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LayoutGrid
                          size={14}
                          className={
                            isChecked ? "text-primary-container" : "text-slate-400"
                          }
                        />
                        <span className="text-sm font-medium text-on-surface">
                          {item.label}
                        </span>
                        {isSensitive ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Yönetici Ekranı
                          </span>
                        ) : null}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleFlagChange("allowedPages", item.key)}
                        className="h-4 w-4 accent-primary-container cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* İşlem Bazlı Yetkiler */}
            <div className="rounded-xl border border-outline-variant bg-surface p-4">
              <SectionTitle
                title="İşlem Yetkileri"
                description="Erişebildiği sayfalarda gerçekleştirebileceği kritik aksiyonları seçin."
              />
              <div className="mt-4 space-y-2.5">
                {permissionOptions.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 cursor-pointer"
                  >
                    <span className="text-sm text-on-surface">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(form.permissions[item.key])}
                      onChange={handleFlagChange("permissions", item.key)}
                      className="h-4 w-4 accent-primary-container cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {formError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
                <span className="font-medium">{formError}</span>
              </div>

              {emailSuggestions.length > 0 ? (
                <div className="pt-1 border-t border-red-200/70">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Alternatif personel e-posta önerileri (seçmek için tıklayın):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {emailSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSelectEmailSuggestion(suggestion)}
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

          <div className="flex justify-end gap-3 border-t border-outline-variant pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? "Kaydediliyor..." : editingUser ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Şifre Değiştirme Modalı */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={closePasswordModal}
        title={
          passwordTargetUser
            ? `${passwordTargetUser.ad} ${passwordTargetUser.soyad} — Şifre Değiştir`
            : "Şifre Değiştir"
        }
        size="sm"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <FormField label="Yeni Şifre" required>
            <TextInput
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordError("");
              }}
              placeholder="En az 5 karakter"
              autoFocus
            />
          </FormField>

          {passwordError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {passwordError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-outline-variant pt-4">
            <button
              type="button"
              onClick={closePasswordModal}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSavingPassword}
              className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSavingPassword ? "Kaydediliyor..." : "Şifreyi Güncelle"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Sayfa Şifreleri Modalı */}
      <Modal
        isOpen={isPagePasswordModalOpen}
        onClose={closePagePasswordModal}
        title={
          pagePasswordTargetUser
            ? `${pagePasswordTargetUser.ad} ${pagePasswordTargetUser.soyad} — Sayfa Şifreleri`
            : "Sayfa Şifreleri"
        }
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Aşağıdaki sayfalar için erişim şifresi belirleyebilirsiniz. Şifre belirlediğiniz sayfalara girilirken personelden bu şifre istenecektir. Kaldırmak için alanı boş bırakıp &ldquo;Kaldır&rdquo; butonuna tıklayın.
          </p>
          <div className="flex flex-col gap-3">
            {Object.entries(PAGE_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-3"
              >
                <div className="flex-1 text-sm font-medium text-on-surface">
                  {label}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Şifre"
                    value={pagePasswordInputs[key]}
                    onChange={(e) =>
                      setPagePasswordInputs((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="w-24 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleSetPagePassword(key)}
                    disabled={isSavingPagePassword[key]}
                    className="rounded-lg bg-primary-container text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer min-w-[70px]"
                  >
                    {isSavingPagePassword[key]
                      ? "..."
                      : pagePasswordInputs[key]
                        ? "Güncelle"
                        : "Kaldır"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={closePagePasswordModal}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
