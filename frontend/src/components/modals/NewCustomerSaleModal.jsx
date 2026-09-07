import { useState, useEffect, useMemo, useRef } from "react";
import Modal from "./Modal";
import DefterInput from "../ui/DefterInput";
import ProductLinesField from "../ui/ProductLinesField";
import {
  FormField,
  TextInput,
  SelectInput,
  TextAreaInput,
} from "../ui/FormField";
import { odemeYontemleri } from "../../data/fakeData";
import {
  validateTC,
  validatePhone,
  validateRequired,
  validateAmount,
  validatePesinat,
} from "../../utils/validators";
import {
  createEmptyProductLine,
  formatProductLines,
  mapProductLinesToUrunler,
  validateProductLines,
} from "../../utils/products";
import { formatAmountInput, parseAmountInput } from "../../utils/money";

const emptyForm = {
  ad: "",
  soyad: "",
  tc: "",
  telefon: "",
  adres: "",
  tarih: new Date().toISOString().split("T")[0],
  odemeYontemi: "Veresiye",
  toplamTutar: "",
  pesinat: "",
  kayitDefteri: "",
};

export default function NewCustomerSaleModal({
  isOpen,
  onClose,
  onSubmit,
  stockOptions,
  defterSuggestions,
  isSubmitting = false,
  submitError = "",
}) {
  const [form, setForm] = useState(emptyForm);
  const [productLines, setProductLines] = useState([createEmptyProductLine()]);
  const [errors, setErrors] = useState({});
  const submitGuardRef = useRef(false);

  const kalanHesap = useMemo(() => {
    const top = parseAmountInput(form.toplamTutar);
    const pes = parseAmountInput(form.pesinat);
    return Math.max(0, top - pes);
  }, [form.toplamTutar, form.pesinat]);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...emptyForm, tarih: new Date().toISOString().split("T")[0] });
      setProductLines([createEmptyProductLine()]);
      setErrors({});
      submitGuardRef.current = false;
    }
  }, [isOpen]);

  const updateField = (field) => (e) => {
    const rawValue = e.target.value;
    const nextValue =
      field === "toplamTutar" || field === "pesinat"
        ? formatAmountInput(rawValue)
        : rawValue;

    setForm((prev) => ({ ...prev, [field]: nextValue }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    const productError = validateProductLines(productLines);
    if (productError) newErrors.urunler = productError;

    const checks = [
      ["ad", validateRequired(form.ad, "Ad")],
      ["soyad", validateRequired(form.soyad, "Soyad")],
      ["tc", validateTC(form.tc)],
      ["telefon", validatePhone(form.telefon)],
      ["adres", validateRequired(form.adres, "Adres")],
      ["tarih", validateRequired(form.tarih, "Tarih")],
      ["odemeYontemi", validateRequired(form.odemeYontemi, "Ödeme yöntemi")],
      ["toplamTutar", validateAmount(form.toplamTutar, "Toplam tutar")],
      ["pesinat", validatePesinat(form.pesinat, form.toplamTutar)],
      [
        "kayitDefteri",
        validateRequired(form.kayitDefteri, "Kayıt edilen defter"),
      ],
    ];
    checks.forEach(([field, err]) => {
      if (err) newErrors[field] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting || submitGuardRef.current) return;
    if (!validate()) return;
    submitGuardRef.current = true;

    try {
      await onSubmit({
        ...form,
        urunBilgisi: formatProductLines(productLines),
        urunler: mapProductLinesToUrunler(productLines),
        toplamTutar: parseAmountInput(form.toplamTutar),
        pesinat: parseAmountInput(form.pesinat) || 0,
        kalanHesap,
      });
    } finally {
      submitGuardRef.current = false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Müşteri & Satış Ekle"
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary-container uppercase tracking-wide border-b border-outline-variant pb-2">
              Müşteri Bilgileri
            </h3>
            <FormField label="Ad" error={errors.ad} required>
              <TextInput
                value={form.ad}
                onChange={updateField("ad")}
                error={errors.ad}
              />
            </FormField>
            <FormField label="Soyad" error={errors.soyad} required>
              <TextInput
                value={form.soyad}
                onChange={updateField("soyad")}
                error={errors.soyad}
              />
            </FormField>
            <FormField label="TC Kimlik No" error={errors.tc} required>
              <TextInput
                value={form.tc}
                onChange={updateField("tc")}
                maxLength={11}
                placeholder="12345678901"
                error={errors.tc}
              />
            </FormField>
            <FormField label="Telefon" error={errors.telefon} required>
              <TextInput
                value={form.telefon}
                onChange={updateField("telefon")}
                placeholder="0555 123 4567"
                error={errors.telefon}
              />
            </FormField>
            <FormField label="Adres" error={errors.adres} required>
              <TextAreaInput
                value={form.adres}
                onChange={updateField("adres")}
                error={errors.adres}
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary-container uppercase tracking-wide border-b border-outline-variant pb-2">
              Satış Bilgileri
            </h3>
            <ProductLinesField
              lines={productLines}
              onChange={(lines) => {
                setProductLines(lines);
                setErrors((prev) => ({ ...prev, urunler: null }));
              }}
              stockOptions={stockOptions}
              error={errors.urunler}
            />
            <FormField label="Tarih" error={errors.tarih} required>
              <TextInput
                type="date"
                value={form.tarih}
                onChange={updateField("tarih")}
                error={errors.tarih}
              />
            </FormField>
            <FormField
              label="Ödeme Yöntemi"
              error={errors.odemeYontemi}
              required
            >
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
            <FormField
              label="Toplam Satış (₺)"
              error={errors.toplamTutar}
              required
            >
              <TextInput
                type="text"
                inputMode="numeric"
                value={form.toplamTutar}
                onChange={updateField("toplamTutar")}
                placeholder="0"
                error={errors.toplamTutar}
              />
            </FormField>
            <FormField
              label="Peşinat / Alınan Ödeme (₺)"
              error={errors.pesinat}
            >
              <TextInput
                type="text"
                inputMode="numeric"
                value={form.pesinat}
                onChange={updateField("pesinat")}
                placeholder="0"
                error={errors.pesinat}
              />
            </FormField>
            <FormField label="Kalan Hesap (₺)">
              <TextInput
                value={kalanHesap.toLocaleString("tr-TR")}
                disabled
                className="bg-surface-container text-on-surface-variant cursor-not-allowed"
              />
            </FormField>
            <DefterInput
              value={form.kayitDefteri}
              onChange={updateField("kayitDefteri")}
              suggestions={defterSuggestions}
              error={errors.kayitDefteri}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
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
        {submitError ? (
          <p className="mt-3 text-sm text-red-600">{submitError}</p>
        ) : null}
      </form>
    </Modal>
  );
}
