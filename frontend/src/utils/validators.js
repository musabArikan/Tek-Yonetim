import { parseAmountInput } from "./money";

export function validateTC(tc) {
  if (!tc || tc.length !== 11) return "TC Kimlik No 11 haneli olmalıdır";
  if (!/^\d{11}$/.test(tc)) return "TC Kimlik No sadece rakam içermelidir";
  if (tc[0] === "0") return "TC Kimlik No 0 ile başlayamaz";
  return null;
}

export function validatePhone(telefon) {
  const cleaned = telefon.replace(/\s/g, "");
  if (!cleaned) return "Telefon numarası zorunludur";
  if (!/^0\d{10}$/.test(cleaned)) {
    return "Geçerli bir telefon numarası girin (örn: 0555 123 4567)";
  }
  return null;
}

export function validateRequired(value, fieldName) {
  if (!value || !String(value).trim()) return `${fieldName} zorunludur`;
  return null;
}

export function validateAmount(value, fieldName = "Tutar") {
  const num = parseAmountInput(value);
  if (isNaN(num) || num <= 0) return `${fieldName} 0'dan büyük olmalıdır`;
  return null;
}

export function validatePesinat(pesinat, toplamTutar) {
  const pes = parseAmountInput(pesinat) || 0;
  const top = parseAmountInput(toplamTutar) || 0;
  if (pes < 0) return "Peşinat negatif olamaz";
  if (pes > top) return "Peşinat toplam tutardan büyük olamaz";
  return null;
}
