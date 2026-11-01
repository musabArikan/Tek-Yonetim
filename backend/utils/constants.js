/**
 * Uygulama genelinde paylaşılan sabitler (frontend ile birebir uyumlu).
 */

const DEFAULT_BRANDS = [
  "Arçelik",
  "Beko",
  "Bosch",
  "Siemens",
  "Profilo",
  "Vestel",
  "Altus",
  "Regal",
  "Grundig",
  "Samsung",
  "LG",
  "Philips",
  "Tefal",
  "Kumtel",
  "Uğur",
];

const DEFAULT_CATEGORIES = [
  "Buzdolabı",
  "Çamaşır Makinesi",
  "Bulaşık Makinesi",
  "Kurutma Makinesi",
  "Ankastre Set",
  "Fırın",
  "Davlumbaz",
  "Derin Dondurucu",
  "Televizyon",
  "Klima",
];

const DEFAULT_PAYMENT_METHODS = [
  "Nakit",
  "Kredi Kartı",
  "Havale",
  "Veresiye",
  "Çek",
  "PayTR",
  "POS Sistem Ödemesi",
  "Bosch Sistem Ödemesi",
  "Gipa Sistem Ödemesi",
  "Profilo Sistem Ödemesi",
];

const EXPENSE_CATEGORIES = ["Maaş", "Kira", "Fatura", "Malzeme/Hırdavat", "Diğer"];

const PERMISSION_KEYS = [
  "musteriSilebilir",
  "tahsilatAlabilir",
  "satisYapabilir",
  "stokDuzenleyebilir",
  "envanterDuzenleyebilir",
  "zRaporuAlabilir",
  "excelExportEdebilir",
];

const PAGE_KEYS = [
  "dashboard",
  "magazam",
  "musteriler",
  "urun-stok",
  "envanter",
  "musteri-finans",
  "raporlar",
  "personeller",
];

const PAGE_PASSWORD_KEYS = ["finans", "stok", "raporlar", "envanter", "transferler"];

const ROLES = ["admin", "yonetici", "kasiyer", "depo_sorumlusu", "personel"];
const ROLE_HIERARCHY = { admin: 4, yonetici: 3, kasiyer: 2, depo_sorumlusu: 2, personel: 1 };

const DEMO_OWNER_EMAIL = "musabarikan@magaza.com";
const DEMO_OWNER_PASSWORD = "123456";

module.exports = {
  DEFAULT_BRANDS,
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  PERMISSION_KEYS,
  PAGE_KEYS,
  PAGE_PASSWORD_KEYS,
  ROLES,
  ROLE_HIERARCHY,
  DEMO_OWNER_EMAIL,
  DEMO_OWNER_PASSWORD,
};

