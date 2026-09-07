import Select from "react-select";
import { Plus, Trash2 } from "lucide-react";
import { FormField, TextInput, TextAreaInput } from "./FormField";
import { createEmptyProductLine } from "../../utils/products";

const productSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderColor: state.isFocused ? "#1e3a8a" : "#c5c5d3",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(30, 58, 138, 0.3)" : "none",
    borderRadius: "0.5rem",
    fontSize: "14px",
    backgroundColor: "var(--color-surface-container-lowest, white)",
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
    color: state.isSelected ? "#ffffff" : "#0b1c30",
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

export default function ProductLinesField({
  lines,
  onChange,
  error,
  stockOptions = [],
}) {
  const updateLine = (id, field, value) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };

        if (field === "envanterdeBekleyenAdet") {
          updated.envanterdeBekleyenAdet = value === "" ? "" : value;
          updated.envanterdeMi = Number(value || 0) > 0;
        }

        if (field === "adet") {
          updated.adet = value === "" ? "" : value;
          updated.envanterdeMi = Number(updated.envanterdeBekleyenAdet || 0) > 0;
        }

        if (field === "urunKodu" && !value) {
          updated.envanterdeBekleyenAdet = "0";
          updated.envanterdeMi = false;
        }

        if (
          (field === "envanterdeBekleyenAdet" && Number(value || 0) <= 0) ||
          !updated.envanterdeMi
        ) {
          updated.envanterAciklamasi = "";
        }

        return updated;
      }),
    );
  };

  const addLine = () => {
    const nextId = Math.max(0, ...lines.map((l) => l.id)) + 1;
    onChange([...lines, createEmptyProductLine(nextId)]);
  };

  const removeLine = (id) => {
    if (lines.length === 1) return;
    onChange(lines.filter((line) => line.id !== id));
  };

  return (
    <div className="space-y-3">
      <FormField label="Ürünler" error={error} required>
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={line.id}
              className="rounded-lg border border-outline-variant bg-surface-container-low p-3 space-y-2"
            >
              <div className="flex gap-2 items-start">
                <div className="flex-grow space-y-2">
                  <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
                    <div className="flex-1 min-w-[200px]">
                      <p className="mb-1 text-xs font-medium text-on-surface-variant">
                        Ürün
                      </p>
                      <Select
                        options={stockOptions}
                        value={
                          stockOptions.find(
                            (option) => option.value === line.urunKodu,
                          ) || null
                        }
                        onChange={(option) =>
                          updateLine(line.id, "urunKodu", option?.value || "")
                        }
                        placeholder={`Ürün seç ${index + 1}`}
                        isClearable
                        isSearchable
                        noOptionsMessage={() => "Ürün bulunamadı"}
                        styles={productSelectStyles}
                        className={error && index === 0 ? "border-error" : ""}
                      />
                    </div>
                    <div className="w-20 shrink-0">
                      <p className="mb-1 text-xs font-medium text-on-surface-variant">
                        Adet
                      </p>
                      <TextInput
                        type="number"
                        min="1"
                        step="1"
                        value={line.adet}
                        onChange={(e) =>
                          updateLine(line.id, "adet", e.target.value)
                        }
                        placeholder="Adet"
                      />
                    </div>
                    <div className="w-20 shrink-0">
                      <p className="mb-1 text-xs font-medium leading-tight text-on-surface-variant">
                        Envanterde Bekletilecek
                      </p>
                      <TextInput
                        type="number"
                        min="0"
                        step="1"
                        value={line.envanterdeBekleyenAdet}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "envanterdeBekleyenAdet",
                            e.target.value,
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {line.urunKodu && (
                    <p className="text-xs text-on-surface-variant">
                      {stockOptions.find((option) => option.value === line.urunKodu)
                        ?.stockMetaText || "Seçili ürün bilgisi bulunamadı"}
                    </p>
                  )}
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="mt-1 p-2 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-colors shrink-0 cursor-pointer"
                    aria-label="Satırı sil"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {Number(line.envanterdeBekleyenAdet) > 0 && (
                <TextAreaInput
                  value={line.envanterAciklamasi}
                  onChange={(e) => updateLine(line.id, "envanterAciklamasi", e.target.value)}
                  placeholder="Envanter Açıklaması (Örn: Düğün tarihi bekleniyor, ev tadilatta...)"
                  rows={2}
                />
              )}
            </div>
          ))}
        </div>
      </FormField>
      <button
        type="button"
        onClick={addLine}
        className="text-sm font-semibold text-primary-container hover:underline flex items-center gap-1 cursor-pointer"
      >
        <Plus size={16} />
        Başka Ürün Ekle
      </button>
    </div>
  );
}
