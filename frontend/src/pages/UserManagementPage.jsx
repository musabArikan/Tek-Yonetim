import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, PlusCircle, Trash2, Users } from "lucide-react";
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

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "yonetici", label: "Yönetici" },
  { value: "kasiyer", label: "Kasiyer" },
  { value: "depo_sorumlusu", label: "Depo Sorumlusu" },
  { value: "personel", label: "Personel" },
];

const permissionOptions = [
  { key: "musteriSilebilir", label: "Kayıt Silebilir" },
  { key: "tahsilatAlabilir", label: "Tahsilat Alabilir" },
  { key: "satisYapabilir", label: "Satış Yapabilir" },
  { key: "stokDuzenleyebilir", label: "Stok Düzenleyebilir" },
  { key: "envanterDuzenleyebilir", label: "Envanter Düzenleyebilir" },
];

const pageLockOptions = [
  { key: "stok", label: "Stok Sayfasını Göremez" },
  { key: "envanter", label: "Emanetler Sayfasını Göremez" },
  { key: "borclular", label: "Borçlular Sayfasını Göremez" },
  { key: "personeller", label: "Personeller Sayfasını Göremez" },
  { key: "raporlar", label: "Raporları Göremez" },
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
  pageLocks: emptyFlags(pageLockOptions),
};

const normalizeUser = (user) => ({
  id: user._id || user.id,
  ad: user.ad || "",
  soyad: user.soyad || "",
  email: user.email || "",
  role: user.role || "personel",
  permissions: user.permissions || emptyFlags(permissionOptions),
  pageLocks: user.pageLocks || emptyFlags(pageLockOptions),
});

const roleLabelMap = Object.fromEntries(
  roleOptions.map((item) => [item.value, item.label]),
);

const SectionTitle = ({ title, description }) => (
  <div>
    <p className="text-sm font-semibold text-on-surface">{title}</p>
    <p className="text-xs text-on-surface-variant">{description}</p>
  </div>
);

export default function UserManagementPage({ currentUserId, onSessionRefresh }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");

  // Şifre değiştirme modal state'leri
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      ad: user.ad,
      soyad: user.soyad,
      email: user.email,
      password: "",
      role: user.role,
      permissions: { ...emptyFlags(permissionOptions), ...user.permissions },
      pageLocks: { ...emptyFlags(pageLockOptions), ...user.pageLocks },
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
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

  const handleFieldChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setFormError("");
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
    email: form.email.trim(),
    ...(editingUser ? {} : { password: form.password }),
    role: form.role,
    permissions: form.permissions,
    pageLocks: form.pageLocks,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.ad.trim() || !form.soyad.trim() || !form.email.trim()) {
      setFormError("Ad, soyad ve e-posta alanları zorunludur.");
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
      const payload = buildPayload();
      const response = editingUser
        ? await updateUser(editingUser.id, payload)
        : await createUser(payload);

      toast.success(
        editingUser
          ? "Personel bilgileri güncellendi."
          : "Yeni personel oluşturuldu.",
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
            İşletmenize bağlı kullanıcıları yönetin.
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
                    Yetkiler
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
                              {isSelf ? "Aktif oturum" : "Personel hesabı"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-on-surface">{user.email}</td>
                      <td className="p-4 text-sm text-on-surface">
                        {roleLabelMap[user.role] || user.role}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {enabledPermissions.length > 0 ? (
                            enabledPermissions.map((item) => (
                              <span
                                key={item.key}
                                className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-on-surface"
                              >
                                {item.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-on-surface-variant">
                              Yetki atanmadı
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Şifre değiştir butonu — kendi hesabı hariç */}
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
                          {/* Düzenle butonu — kendi hesabı hariç */}
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
                          {/* Sil butonu — kendi hesabı hariç */}
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
                placeholder="Örn: Ayşe"
              />
            </FormField>
            <FormField label="Soyad" required>
              <TextInput
                value={form.soyad}
                onChange={handleFieldChange("soyad")}
                placeholder="Örn: Kaya"
              />
            </FormField>
            <FormField label="E-posta" required>
              <TextInput
                type="email"
                value={form.email}
                onChange={handleFieldChange("email")}
                placeholder="personel@isletme.com"
              />
            </FormField>
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
              <div className="md:col-span-2">
                <FormField label="Şifre" required>
                  <TextInput
                    type="password"
                    value={form.password}
                    onChange={handleFieldChange("password")}
                    placeholder="En az 5 karakter"
                  />
                </FormField>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-outline-variant bg-surface p-4">
              <SectionTitle
                title="Yetkiler"
                description="Kritik işlemleri gerçekleştirebileceği alanları seçin."
              />
              <div className="mt-4 space-y-3">
                {permissionOptions.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                  >
                    <span className="text-sm text-on-surface">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(form.permissions[item.key])}
                      onChange={handleFlagChange("permissions", item.key)}
                      className="h-4 w-4 accent-primary-container"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant bg-surface p-4">
              <SectionTitle
                title="Sayfa Kısıtlamaları"
                description="Görmesini istemediğiniz ekranları kapatın."
              />
              <div className="mt-4 space-y-3">
                {pageLockOptions.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                  >
                    <span className="text-sm text-on-surface">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(form.pageLocks[item.key])}
                      onChange={handleFlagChange("pageLocks", item.key)}
                      className="h-4 w-4 accent-primary-container"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
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
    </div>
  );
}
