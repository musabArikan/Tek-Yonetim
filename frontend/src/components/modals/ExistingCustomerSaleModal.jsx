import { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import Modal from "./Modal";
import DefterInput from "../ui/DefterInput";
import ProductLinesField from "../ui/ProductLinesField";
import { FormField, TextInput, SelectInput } from "../ui/FormField";
import { odemeYontemleri } from "../../data/fakeData";
import { getFullName } from "../../utils/formatters";
import {
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

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderColor: state.isFocused ? "#1e3a8a" : "#c5c5d3",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(30, 58, 138, 0.3)" : "none",
    borderRadius: "0.5rem",
    fontSize: "14px",
    "&:hover": { borderColor: "#1e3a8a" },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "14px",
    backgroundColor: state.isSelected
      ? "#1e3a8a"
      : state.isFocused
        ? "#e5eeff"
        : "white",
    color: state.isSelected ? "#90a8ff" : "#0b1c30",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

const emptyForm = {
  musteriId: null,
  tarih: new Date().toISOString().split("T")[0],
  odemeYontemi: "Veresiye",
  toplamTutar: "",
  pesinat: "",
  kayitDefteri: "",
};

export default function ExistingCustomerSaleModal({
  isOpen,
  onClose,
  onSubmit,
  customers,
  stockOptions,
  defterSuggestions,
  isSubmitting = false,
  submitError = "",
}) {
  const [form, setForm] = useState(emptyForm);
  const [productLines, setProductLines] = useState([createEmptyProductLine()]);
  const [errors, setErrors] = useState({});

  const kalanHesap = useMemo(() => {
    const top = parseAmountInput(form.toplamTutar);
    const pes = parseAmountInput(form.pesinat);
    return Math.max(0, top - pes);
  }, [form.toplamTutar, form.pesinat]);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${getFullName(c)} — TC: ${c.tc} — ${c.telefon}`,
        customer: c,
      })),
    [customers],
  );

  const selectedOption =
    customerOptions.find((o) => o.value === form.musteriId) || null;

  useEffect(() => {
    if (isOpen) {
      setForm({ ...emptyForm, tarih: new Date().toISOString().split("T")[0] });
      setProductLines([createEmptyProductLine()]);
      setErrors({});
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

  const handleCustomerChange = (option) => {
    setForm((prev) => ({ ...prev, musteriId: option?.value || null }));
    setErrors((prev) => ({ ...prev, musteriId: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.musteriId) newErrors.musteriId = "Müşteri seçimi zorunludur";

    const productError = validateProductLines(productLines);
    if (productError) newErrors.urunler = productError;

    const checks = [
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      urunBilgisi: formatProductLines(productLines),
      urunler: mapProductLinesToUrunler(productLines),
      toplamTutar: parseAmountInput(form.toplamTutar),
      pesinat: parseAmountInput(form.pesinat) || 0,
      kalanHesap,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mevcut Müşteriye Satış Ekle"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Müşteri Seç" error={errors.musteriId} required>
          <Select
            options={customerOptions}
            value={selectedOption}
            onChange={handleCustomerChange}
            placeholder="İsim, TC veya telefon ile ara..."
            isClearable
            isSearchable
            noOptionsMessage={() => "Müşteri bulunamadı"}
            styles={selectStyles}
            filterOption={(option, input) => {
              const search = input.toLowerCase();
              const c = option.data.customer;
              return (
                c.ad.toLowerCase().includes(search) ||
                c.soyad.toLowerCase().includes(search) ||
                c.tc.includes(search) ||
                c.telefon.replace(/\s/g, "").includes(search.replace(/\s/g, ""))
              );
            }}
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

        <ProductLinesField
          lines={productLines}
          onChange={(lines) => {
            setProductLines(lines);
            setErrors((prev) => ({ ...prev, urunler: null }));
          }}
          stockOptions={stockOptions}
          error={errors.urunler}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <FormField label="Peşinat / Alınan Ödeme (₺)" error={errors.pesinat}>
            <TextInput
              type="text"
              inputMode="numeric"
              value={form.pesinat}
              onChange={updateField("pesinat")}
              placeholder="0"
              error={errors.pesinat}
            />
          </FormField>
        </div>

        <FormField label="Kalan Hesap (₺)">
          <TextInput
            value={kalanHesap.toLocaleString("tr-TR")}
            disabled
            className="bg-surface-container text-on-surface-variant cursor-not-allowed"
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

        <DefterInput
          value={form.kayitDefteri}
          onChange={updateField("kayitDefteri")}
          suggestions={defterSuggestions}
          error={errors.kayitDefteri}
        />

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
            {isSubmitting ? "Kaydediliyor..." : "Satış Kaydet"}
          </button>
        </div>
        {submitError ? (
          <p className="mt-3 text-sm text-red-600">{submitError}</p>
        ) : null}
      </form>
    </Modal>
  );
}
