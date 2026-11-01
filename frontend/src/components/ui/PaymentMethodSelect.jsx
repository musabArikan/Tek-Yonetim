import { useState, useEffect, useMemo } from "react";
import { Plus, Check, X } from "lucide-react";
import { SelectInput } from "./FormField";
import api from "../../utils/api";
import { localDb, DEFAULT_PAYMENT_METHODS } from "../../utils/localDb";

const ADD_NEW_VALUE = "__ADD_NEW_PAYMENT_METHOD__";

const fallbackMethods = Array.isArray(DEFAULT_PAYMENT_METHODS)
  ? DEFAULT_PAYMENT_METHODS
  : ["Nakit", "Kredi Kartı", "Havale", "Veresiye", "Çek"];

const readSafeMethods = () => {
  try {
    const data = localDb?.paymentMethods?.list?.();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return [...fallbackMethods];
  } catch {
    return [...fallbackMethods];
  }
};

export default function PaymentMethodSelect({
  value,
  onChange,
  error,
  className = "",
}) {
  const [methods, setMethods] = useState(() => readSafeMethods());
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [previousValue, setPreviousValue] = useState(value || "Nakit");

  const safeMethods = useMemo(
    () =>
      Array.isArray(methods) && methods.length > 0
        ? methods
        : [...fallbackMethods],
    [methods],
  );

  useEffect(() => {
    let isMounted = true;
    const applyList = (rawList) => {
      if (!isMounted) return;
      const list =
        Array.isArray(rawList) && rawList.length > 0
          ? rawList
          : [...fallbackMethods];
      if (value && !list.includes(value) && value !== ADD_NEW_VALUE) {
        setMethods([...list, value]);
      } else {
        setMethods(list);
      }
    };

    api
      .get("/store/payment-methods")
      .then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          applyList(res.data);
        } else {
          applyList(readSafeMethods());
        }
      })
      .catch(() => {
        applyList(readSafeMethods());
      });

    return () => {
      isMounted = false;
    };
  }, [value]);

  const emitChange = (nextVal) => {
    if (typeof onChange === "function") {
      onChange({ target: { value: nextVal } });
    }
  };

  const handleSelectChange = (e) => {
    const selected = e.target.value;
    if (selected === ADD_NEW_VALUE) {
      setPreviousValue(value || safeMethods[0] || "Nakit");
      setNewMethodName("");
      setIsAddingNew(true);
      return;
    }
    emitChange(selected);
  };

  const handleOpenAddNew = () => {
    setPreviousValue(value || safeMethods[0] || "Nakit");
    setNewMethodName("");
    setIsAddingNew(true);
  };

  const handleConfirmNew = async () => {
    const cleaned = String(newMethodName || "").trim();
    if (!cleaned) return;
    try {
      let updatedList = null;
      try {
        const res = await api.post("/store/payment-methods", { name: cleaned });
        if (Array.isArray(res?.data?.methods)) {
          updatedList = res.data.methods;
        } else if (Array.isArray(res?.data)) {
          updatedList = res.data;
        }
      } catch {
        // Çevrimdışı durumda lokal listeye kaydet
      }

      const localUpdated = await Promise.resolve(
        localDb?.paymentMethods?.add?.(cleaned),
      );
      const updated =
        Array.isArray(updatedList) && updatedList.length > 0
          ? updatedList
          : Array.isArray(localUpdated) && localUpdated.length > 0
            ? localUpdated
            : [...new Set([...safeMethods, cleaned])];

      setMethods(updated);
      const matched =
        updated.find(
          (m) =>
            String(m).toLocaleLowerCase("tr-TR") ===
            cleaned.toLocaleLowerCase("tr-TR"),
        ) || cleaned;
      emitChange(matched);
    } catch {
      if (!safeMethods.includes(cleaned)) {
        setMethods((prev) => {
          const base = Array.isArray(prev) ? prev : [...fallbackMethods];
          return [...base, cleaned];
        });
      }
      emitChange(cleaned);
    }
    setIsAddingNew(false);
    setNewMethodName("");
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewMethodName("");
    emitChange(previousValue || safeMethods[0] || "Nakit");
  };

  const currentSelectValue = safeMethods.includes(value)
    ? value
    : safeMethods[0] || "Nakit";

  return (
    <div className="space-y-2">
      {!isAddingNew ? (
        <div className="space-y-1.5">
          <SelectInput
            value={currentSelectValue}
            onChange={handleSelectChange}
            error={error}
            className={className}
          >
            {safeMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
            <option value={ADD_NEW_VALUE}>+ Yeni Ödeme Yöntemi Ekle...</option>
          </SelectInput>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOpenAddNew}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Ödeme Yöntemi Ekle
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
          <div className="text-xs font-semibold text-blue-900">
            Yeni Ödeme Yöntemi Ekle
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMethodName}
              onChange={(e) => {
                const val = e.target.value;
                setNewMethodName(val);
                if (val.trim()) {
                  emitChange(val.trim());
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleConfirmNew();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancelNew();
                }
              }}
              placeholder="Örn: Arçelik Sistem Ödemesi, Mail Order..."
              autoFocus
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-blue-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
            />
            <button
              type="button"
              onClick={() => void handleConfirmNew()}
              disabled={!newMethodName.trim()}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Ekle
            </button>
            <button
              type="button"
              onClick={handleCancelNew}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              İptal
            </button>
          </div>
          <p className="text-[11px] text-blue-700">
            Eklediğiniz ödeme yöntemi mağazanıza özel olarak kaydedilir ve sonraki işlemlerde listede görünür.
          </p>
        </div>
      )}
    </div>
  );
}
