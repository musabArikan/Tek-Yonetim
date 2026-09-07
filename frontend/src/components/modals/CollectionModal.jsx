import { useState, useEffect } from "react";
import Modal from "./Modal";
import DefterInput from "../ui/DefterInput";
import { FormField, TextInput, SelectInput } from "../ui/FormField";
import { odemeYontemleri } from "../../data/fakeData";
import { getFullName } from "../../utils/formatters";
import { validateRequired, validateAmount } from "../../utils/validators";
import { formatAmountInput, parseAmountInput } from "../../utils/money";

const emptyForm = {
  tutar: "",
  tarih: new Date().toISOString().split("T")[0],
  odemeYontemi: "Nakit",
  kayitDefteri: "",
  aciklama: "",
};

export default function CollectionModal({
  isOpen,
  onClose,
  onSubmit,
  customer,
  defterSuggestions,
  submitError = "",
  isSubmitting = false,
}) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm({ ...emptyForm, tarih: new Date().toISOString().split("T")[0] });
      setErrors({});
      setLocalError("");
    }
  }, [isOpen]);

  const updateField = (field) => (e) => {
    const rawValue = e.target.value;
    const nextValue =
      field === "tutar" ? formatAmountInput(rawValue) : rawValue;

    setForm((prev) => ({ ...prev, [field]: nextValue }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    const checks = [
      ["tutar", validateAmount(form.tutar, "Tahsilat tutarı")],
      ["tarih", validateRequired(form.tarih, "Tarih")],
      ["odemeYontemi", validateRequired(form.odemeYontemi, "Ödeme yöntemi")],
      [
        "kayitDefteri",
        validateRequired(form.kayitDefteri, "Kayıt edilen defter"),
      ],
    ];
    checks.forEach(([field, err]) => {
      if (err) newErrors[field] = err;
    });
    const tutar = parseAmountInput(form.tutar) || 0;
    if (customer && tutar > customer.toplamKalanBakiye) {
      newErrors.tutar = "Tahsilat tutarı kalan bakiyeden büyük olamaz";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLocalError("");
      await onSubmit({
        musteriId: customer._id || customer.id,
        tarih: form.tarih,
        islemTuru: "Tahsilat",
        odenenTutar: parseAmountInput(form.tutar),
        odemeYontemi: form.odemeYontemi,
        kayitDefteri: form.kayitDefteri,
        aciklama: form.aciklama || "",
      });
      onClose();
    } catch (error) {
      console.error("Hata Detayı:", error);
      setLocalError(
        error?.response?.data?.message ||
          "Tahsilat kaydedilemedi. Lütfen tekrar deneyin.",
      );
    }
  };

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tahsilat Ekle — ${getFullName(customer)}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Tahsilat Tutarı (₺)" error={errors.tutar} required>
          <TextInput
            type="text"
            inputMode="numeric"
            value={form.tutar}
            onChange={updateField("tutar")}
            placeholder="0"
            error={errors.tutar}
          />
        </FormField>
        <FormField label="Tarih" error={errors.tarih} required>
          <TextInput
            type="date"
            value={form.tarih}
            onChange={updateField("tarih")}
            error={errors.tarih}
          />
        </FormField>
        <FormField label="Ödeme Yöntemi" error={errors.odemeYontemi} required>
          <SelectInput
            value={form.odemeYontemi}
            onChange={updateField("odemeYontemi")}
            error={errors.odemeYontemi}
          >
            {odemeYontemleri.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Açıklama">
          <TextInput
            value={form.aciklama}
            onChange={updateField("aciklama")}
            placeholder="Opsiyonel açıklama"
          />
        </FormField>
        <DefterInput
          value={form.kayitDefteri}
          onChange={updateField("kayitDefteri")}
          suggestions={defterSuggestions}
          error={errors.kayitDefteri}
        />

        {(submitError || localError) && (
          <p className="mt-3 text-sm font-medium text-red-600">
            {submitError || localError}
          </p>
        )}

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
            {isSubmitting ? "Kaydediliyor..." : "Tahsilat Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
