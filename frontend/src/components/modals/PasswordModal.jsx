import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import Modal from "./Modal";
import { TextInput } from "../ui/FormField";

export default function PasswordModal({
  isOpen,
  title,
  description,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setPassword("");
    setError("");
  }, [isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextError = onSubmit(password);
    if (nextError) {
      setError(nextError);
      return;
    }

    setError("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xs">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="rounded-xl border border-primary-container/20 bg-primary-container/5 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-white">
              <LockKeyhole size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">
                Yetkili Onayı Gerekli
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-on-surface-variant">
            Şifre
          </label>
          <TextInput
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) {
                setError("");
              }
            }}
            placeholder="Şifrenizi girin"
            autoFocus
            error={error}
          />
          {error ? <p className="mt-1.5 text-xs text-error">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-outline-variant pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-3.5 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary-container px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Kontrol Ediliyor..." : "Onayla"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
