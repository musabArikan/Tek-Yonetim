import { useState, useEffect } from "react";
import Modal from "./Modal";
import { FormField, TextInput, SelectInput } from "../ui/FormField";
import { markalar } from "../../data/stockData";
import { validateRequired, validateAmount } from "../../utils/validators";

const emptyForm = {
  urunKodu: "",
  marka: markalar[0],
  adet: "",
};

export default function AddStockModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setErrors({});
    }
  }, [isOpen]);

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    const checks = [
      ["urunKodu", validateRequired(form.urunKodu, "Ürün kodu")],
      ["marka", validateRequired(form.marka, "Marka")],
      ["adet", validateAmount(form.adet, "Adet")],
    ];
    checks.forEach(([field, err]) => {
      if (err) newErrors[field] = err;
    });

    const adet = parseInt(form.adet, 10);
    if (!newErrors.adet && (!Number.isInteger(adet) || adet <= 0)) {
      newErrors.adet = "Adet tam sayı ve 0'dan büyük olmalıdır";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      urunKodu: form.urunKodu.trim(),
      marka: form.marka,
      adet: parseInt(form.adet, 10),
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yeni Stok Ekle" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Ürün Kodu" error={errors.urunKodu} required>
          <TextInput
            value={form.urunKodu}
            onChange={updateField("urunKodu")}
            placeholder="Örn: BSH-WAT28461"
            error={errors.urunKodu}
          />
        </FormField>

        <FormField label="Marka" error={errors.marka} required>
          <SelectInput
            value={form.marka}
            onChange={updateField("marka")}
            error={errors.marka}
          >
            {markalar.map((marka) => (
              <option key={marka} value={marka}>
                {marka}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Adet" error={errors.adet} required>
          <TextInput
            type="number"
            min="1"
            step="1"
            value={form.adet}
            onChange={updateField("adet")}
            placeholder="0"
            error={errors.adet}
          />
        </FormField>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-semibold bg-primary-container text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
