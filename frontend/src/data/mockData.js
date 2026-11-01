/**
 * Lokal Veri Motoru — başlangıç (seed) verileri.
 *
 * `buildSeedDatabase()` her çağrıldığında tutarlı bir veritabanı nesnesi üretir:
 *  - müşteri bakiyeleri işlem geçmişinden HESAPLANIR (elle yazılmaz),
 *  - stoktaki `envanterdekiAdet` değerleri satış satırlarındaki bekleyen adetlerden HESAPLANIR,
 *  - kasa (collections) ve işlem günlüğü (actionLogs) kayıtları işlemlerden türetilir.
 *
 * Not: Bu bir DEMO verisidir. Şifreler (hepsi "123456") yalnızca tarayıcıdaki
 * localStorage içinde düz metin tutulur; gerçek bir backend'e geçildiğinde kullanılmaz.
 */

export const DB_VERSION = 2;
export const STORE_ID = "store_gunes";
export const DEMO_PASSWORD = "123456";

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

/** "2026-10-14T14:35" (yerel saat) → ISO string. "2026-10-14" → 10:00 yerel. */
const localIso = (value) =>
  new Date(value.length === 10 ? `${value}T10:00:00` : `${value}:00`).toISOString();

/** Geçerli bir TC Kimlik No üretir (9 haneli tabandan, resmi algoritma ile). */
const makeTcKimlik = (base9) => {
  const d = base9.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = (d.reduce((sum, n) => sum + n, 0) + d10) % 10;
  return `${base9}${d10}${d11}`;
};

const pad4 = (n) => String(n).padStart(4, "0");
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const paymentMethodMap = {
  Nakit: "Nakit",
  "Kredi Kartı": "Kart",
  Havale: "Havale",
  EFT: "EFT",
  Çek: "Çek",
};

// ─── Mağaza ───────────────────────────────────────────────────────────────────

const STORE = {
  _id: STORE_ID,
  id: STORE_ID,
  ad: "Güneş Beyaz Eşya Mağazası",
  unvan: "Güneş Beyaz Eşya Pazarlama Ltd. Şti.",
  yetkili: "Ahmet Yılmaz",
  adres: "Kızılay Mah. Atatürk Bulvarı No:112, Çankaya / Ankara",
  telefon: "0312 555 01 01",
  email: "ahmet.yilmaz@tekyonetim.com",
  kurucuEmail: "ahmet.yilmaz@tekyonetim.com",
  mailDomain: "tekyonetim.com",
  vergiDairesi: "Çankaya",
  vergiNo: "1234567890",
  isActive: true,
  createdAt: localIso("2024-01-02T09:00"),
  updatedAt: localIso("2024-01-02T09:00"),
};

// ─── Personeller ──────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = {
  musteriSilebilir: true,
  tahsilatAlabilir: true,
  satisYapabilir: true,
  stokDuzenleyebilir: true,
  envanterDuzenleyebilir: true,
  zRaporuAlabilir: true,
  excelExportEdebilir: true,
};

const NO_PERMISSIONS = Object.fromEntries(
  Object.keys(ALL_PERMISSIONS).map((key) => [key, false]),
);

const NO_LOCKS = {
  stok: false,
  envanter: false,
  borclular: false,
  personeller: false,
  raporlar: false,
};

const USER_SPECS = [
  {
    key: "ahmet",
    ad: "Ahmet",
    soyad: "Yılmaz",
    email: "ahmet.yilmaz@tekyonetim.com",
    role: "admin",
    permissions: ALL_PERMISSIONS,
    createdAt: "2024-01-02T09:10",
  },
  {
    key: "ayse",
    ad: "Ayşe",
    soyad: "Demir",
    email: "ayse.demir@tekyonetim.com",
    role: "yonetici",
    permissions: ALL_PERMISSIONS,
    createdAt: "2024-01-02T09:20",
  },
  {
    key: "mehmet",
    ad: "Mehmet",
    soyad: "Kaya",
    email: "mehmet.kaya@tekyonetim.com",
    role: "kasiyer",
    permissions: {
      ...NO_PERMISSIONS,
      satisYapabilir: true,
      tahsilatAlabilir: true,
    },
    createdAt: "2024-01-05T10:00",
  },
  {
    key: "zeynep",
    ad: "Zeynep",
    soyad: "Çelik",
    email: "zeynep.celik@tekyonetim.com",
    role: "depo_sorumlusu",
    permissions: {
      ...NO_PERMISSIONS,
      stokDuzenleyebilir: true,
      envanterDuzenleyebilir: true,
    },
    createdAt: "2024-01-08T11:30",
  },
];

// ─── Ürünler ──────────────────────────────────────────────────────────────────
// [kod, ad, marka, kategori, alış, satış, stok, kritik seviye, garanti(ay), eklenme tarihi]

const PRODUCT_SPECS = [
  ["KGN86AI42N", "Bosch Serie 4 No Frost Alttan Donduruculu Buzdolabı 186 cm", "Bosch", "Buzdolabı", 22100, 28500, 5, 5, 24, "2024-01-09"],
  ["KGN39VIEB", "Bosch Serie 4 No Frost Buzdolabı 203 cm Inox", "Bosch", "Buzdolabı", 19300, 24900, 12, 5, 24, "2024-01-09"],
  ["WGA254A0TR", "Bosch Serie 6 9 kg 1400 Devir Çamaşır Makinesi", "Bosch", "Çamaşır Makinesi", 17000, 21900, 25, 5, 24, "2024-01-09"],
  ["WAN24180TR", "Bosch Serie 2 8 kg 1200 Devir Çamaşır Makinesi", "Bosch", "Çamaşır Makinesi", 11900, 15400, 12, 5, 24, "2024-01-09"],
  ["SMS4IKI51T", "Bosch Serie 4 5 Programlı Bulaşık Makinesi", "Bosch", "Bulaşık Makinesi", 13100, 17200, 2, 5, 24, "2024-01-09"],
  ["WTH85V00TR", "Bosch Serie 4 8 kg Isı Pompalı Kurutma Makinesi", "Bosch", "Kurutma Makinesi", 18500, 23800, 5, 5, 24, "2024-02-12"],
  ["HBF113BR0T-SET", "Bosch Serie 2 Ankastre Set (Fırın + Ocak + Davlumbaz)", "Bosch", "Ankastre Set", 25400, 32900, 2, 3, 24, "2024-02-12"],
  ["CM10120TR", "Profilo 10 kg 1200 Devir Çamaşır Makinesi", "Profilo", "Çamaşır Makinesi", 12800, 16900, 12, 5, 24, "2024-01-09"],
  ["BM4282EG", "Profilo 4 Programlı Bulaşık Makinesi", "Profilo", "Bulaşık Makinesi", 11200, 14600, 5, 5, 24, "2024-01-09"],
  ["BD2056W3VN", "Profilo No Frost Buzdolabı 186 cm Beyaz", "Profilo", "Buzdolabı", 15200, 19800, 0, 5, 24, "2024-01-09"],
  ["KMP8120TR", "Profilo 8 kg Isı Pompalı Kurutma Makinesi", "Profilo", "Kurutma Makinesi", 16100, 20900, 2, 5, 24, "2024-03-04"],
  ["ASP3000X-SET", "Profilo Ankastre Set (Fırın + Ocak + Davlumbaz) Inox", "Profilo", "Ankastre Set", 21200, 27500, 12, 3, 24, "2024-03-04"],
  ["DVL6020X", "Profilo 60 cm Inox Davlumbaz", "Profilo", "Davlumbaz", 3100, 4500, 25, 5, 24, "2024-03-04"],
  ["KG49NXIF0N", "Siemens iQ300 No Frost Alttan Donduruculu Buzdolabı 203 cm", "Siemens", "Buzdolabı", 27500, 34900, 2, 5, 24, "2024-04-15"],
  ["WM14N2E0TR", "Siemens iQ300 9 kg 1400 Devir Çamaşır Makinesi", "Siemens", "Çamaşır Makinesi", 17400, 22400, 15, 5, 24, "2024-04-15"],
  ["SN23HI42MT", "Siemens iQ300 5 Programlı Bulaşık Makinesi", "Siemens", "Bulaşık Makinesi", 14900, 19400, 5, 5, 24, "2024-04-15"],
  ["WT47XM00TR", "Siemens iQ700 9 kg Isı Pompalı Kurutma Makinesi", "Siemens", "Kurutma Makinesi", 23200, 29900, 0, 5, 24, "2024-04-15"],
  ["HB578A0S0T-SET", "Siemens iQ500 Ankastre Set (Fırın + Ocak + Davlumbaz)", "Siemens", "Ankastre Set", 29800, 38500, 5, 3, 24, "2024-04-15"],
];

const BARCODE_PREFIX = {
  Bosch: "4242005",
  Profilo: "8690842",
  Siemens: "4242003",
};

// ─── Müşteriler ───────────────────────────────────────────────────────────────
// [musteriNo, ad, soyad, TC tabanı, telefon, adres]

const CUSTOMER_SPECS = [
  [1001, "Hasan", "Aydın", "103482917", "0532 417 2891", "Kızılay Mah. Meşrutiyet Cad. No:34 D:6, Çankaya / Ankara"],
  [1002, "Fatma", "Şahin", "214759386", "0505 316 7402", "Etlik Mah. Kızılcaörencik Sok. No:12 D:3, Keçiören / Ankara"],
  [1003, "Mustafa", "Öztürk", "327165840", "0533 882 1540", "Batıkent Mah. 1871. Sok. No:8 D:11, Yenimahalle / Ankara"],
  [1004, "Emine", "Arslan", "438291075", "0542 109 6377", "Demetevler Mah. 5. Cad. No:41 D:2, Yenimahalle / Ankara"],
  [1005, "İbrahim", "Doğan", "541807362", "0555 740 2918", "Mamak Mah. Gülseren Sok. No:19, Mamak / Ankara"],
  [1006, "Hatice", "Kılıç", "652934718", "0536 524 0163", "Dikmen Mah. Çağlayan Sok. No:27 D:9, Çankaya / Ankara"],
  [1007, "Ali", "Yıldırım", "763018245", "0530 691 8244", "Sincan Mah. Atatürk Cad. No:102 D:4, Sincan / Ankara"],
  [1008, "Zehra", "Koç", "874526190", "0544 213 9056", "Ostim Mah. 1203. Sok. No:6 D:1, Yenimahalle / Ankara"],
  [1009, "Süleyman", "Polat", "985130427", "0507 338 4129", "Pursaklar Mah. Fatih Cad. No:55 D:7, Pursaklar / Ankara"],
  [1010, "Merve", "Aksoy", "196374825", "0539 477 1285", "Çayyolu Mah. 2610. Sok. No:14 D:8, Çankaya / Ankara"],
  [1011, "Burak", "Karaca", "207485936", "0553 905 3671", "Eryaman Mah. 124. Cad. No:9 D:15, Etimesgut / Ankara"],
  [1012, "Elif", "Güler", "318596147", "0546 182 6703", "Ayrancı Mah. Büklüm Sok. No:31 D:4, Çankaya / Ankara"],
  [1013, "Kemal", "Erdem", "429607258", "0537 266 5098", "Gölbaşı Mah. Ankara Cad. No:78, Gölbaşı / Ankara"],
  [1014, "Selin", "Yavuz", "530718369", "0531 840 2716", "Çukurambar Mah. 1472. Sok. No:20 D:6, Çankaya / Ankara"],
  [1015, "Murat", "Bulut", "641829470", "0549 718 3452", "Altındağ Mah. Hacıbayram Cad. No:63 D:3, Altındağ / Ankara"],
  [1016, "Derya", "Çetin", "752930581", "0506 429 8137", "Ümitköy Mah. 2. Cad. No:44 D:5, Çankaya / Ankara"],
  [1017, "Okan", "Taş", "863041692", "0538 154 0963", "Zafer Mah. Şehit Cad. No:18 D:2, Polatlı / Ankara"],
  [1018, "Gül", "Şimşek", "974152703", "0552 367 9021", "Şentepe Mah. 40. Sok. No:3 D:10, Yenimahalle / Ankara"],
];

// ─── İşlemler ─────────────────────────────────────────────────────────────────
// type: "S" = Satış, "T" = Tahsilat
// items: [ürünKodu, adet, envanterdeBekleyenAdet?, envanterAçıklaması?]
// Bakiye, kalan borç, toplam tutar vb. alanlar aşağıda HESAPLANIR.

const TX_SPECS = [
  // ── 2023 ──
  { d: "2023-11-15T11:20", c: 1002, by: "ahmet", type: "S", items: [["BM4282EG", 1]], pes: 8000, pay: "Nakit" },
  { d: "2023-12-18T14:45", c: 1002, by: "mehmet", type: "T", amount: 6600, pay: "Nakit", not: "2023 kalan borç kapatıldı" },

  // ── 2024 ──
  { d: "2024-01-12T10:35", c: 1001, by: "mehmet", type: "S", items: [["KGN86AI42N", 1]], pes: 15000, pay: "Nakit" },
  { d: "2024-01-20T16:40", c: 1002, by: "ayse", type: "S", items: [["CM10120TR", 1]], pes: 16900, pay: "Kredi Kartı" },
  { d: "2024-02-03T12:15", c: 1003, by: "mehmet", type: "S", items: [["SMS4IKI51T", 1]], pes: 10000, pay: "Nakit" },
  { d: "2024-02-09T14:20", c: 1001, by: "mehmet", type: "T", amount: 8000, pay: "Havale", not: "Havale ile kısmi ödeme" },
  { d: "2024-03-15T11:05", c: 1001, by: "ayse", type: "T", amount: 5500, pay: "Nakit", not: "Kalan borç kapatıldı" },
  { d: "2024-03-18T09:50", c: 1004, by: "ahmet", type: "S", items: [["HBF113BR0T-SET", 1]], pes: 20000, pay: "Havale" },
  { d: "2024-04-11T15:30", c: 1003, by: "ahmet", type: "T", amount: 7200, pay: "Nakit", not: "Kalan borç kapatıldı" },
  { d: "2024-05-20T13:10", c: 1004, by: "mehmet", type: "T", amount: 12900, pay: "Havale", not: "Kalan borç kapatıldı" },
  { d: "2024-06-05T17:25", c: 1005, by: "ayse", type: "S", items: [["WAN24180TR", 1], ["BM4282EG", 1]], pes: 12000, pay: "Kredi Kartı" },
  { d: "2024-09-14T11:45", c: 1005, by: "mehmet", type: "T", amount: 10000, pay: "Nakit" },
  { d: "2024-12-02T10:20", c: 1005, by: "ayse", type: "T", amount: 8000, pay: "Havale", not: "Kalan borç kapatıldı" },

  // ── 2025 ──
  { d: "2025-02-10T11:30", c: 1006, by: "mehmet", type: "S", items: [["WM14N2E0TR", 1], ["DVL6020X", 1]], pes: 10000, pay: "Nakit" },
  { d: "2025-02-14T14:05", c: 1007, by: "ayse", type: "S", items: [["KG49NXIF0N", 1], ["WT47XM00TR", 1]], pes: 20000, pay: "Kredi Kartı" },
  { d: "2025-03-28T15:40", c: 1006, by: "mehmet", type: "T", amount: 8000, pay: "Nakit" },
  { d: "2025-05-22T10:10", c: 1008, by: "ahmet", type: "S", items: [["KGN39VIEB", 1]], pes: 24900, pay: "Havale" },
  { d: "2025-06-16T12:00", c: 1006, by: "ahmet", type: "T", amount: 8900, pay: "Kredi Kartı", not: "Kalan borç kapatıldı" },
  { d: "2025-07-09T16:30", c: 1007, by: "mehmet", type: "T", amount: 12000, pay: "Havale" },
  { d: "2025-09-08T13:25", c: 1009, by: "mehmet", type: "S", items: [["BD2056W3VN", 1], ["KMP8120TR", 1]], pes: 15000, pay: "Nakit" },
  { d: "2025-11-30T11:50", c: 1010, by: "ayse", type: "S", items: [["ASP3000X-SET", 1]], pes: 27500, pay: "Kredi Kartı" },
  { d: "2025-12-18T14:15", c: 1007, by: "ahmet", type: "T", amount: 6000, pay: "Nakit" },
  { d: "2025-12-22T10:40", c: 1009, by: "mehmet", type: "T", amount: 5000, pay: "Nakit" },

  // ── 2026 (Eylül – Ekim) ──
  { d: "2026-09-02T10:15", c: 1011, by: "mehmet", type: "S", items: [["WGA254A0TR", 2, 2, "Ev tadilatı bitene kadar depoda bekleyecek"]], pes: 15000, pay: "Nakit" },
  { d: "2026-09-09T15:55", c: 1012, by: "ayse", type: "S", items: [["KGN86AI42N", 1, 1, "Yeni eve taşınınca teslim edilecek"], ["DVL6020X", 1]], pes: 10000, pay: "Kredi Kartı" },
  { d: "2026-09-16T12:30", c: 1013, by: "ahmet", type: "S", items: [["SN23HI42MT", 1], ["WM14N2E0TR", 1]], pes: 41800, pay: "Havale" },
  { d: "2026-09-23T17:05", c: 1014, by: "mehmet", type: "S", items: [["HB578A0S0T-SET", 1]], pes: 12000, pay: "Nakit" },
  { d: "2026-09-28T11:20", c: 1011, by: "ayse", type: "T", amount: 8000, pay: "Havale" },
  { d: "2026-10-01T10:45", c: 1015, by: "ayse", type: "S", items: [["CM10120TR", 1], ["BM4282EG", 1]], pes: 8000, pay: "Nakit" },
  { d: "2026-10-05T14:50", c: 1012, by: "mehmet", type: "T", amount: 5000, pay: "Nakit" },
  { d: "2026-10-07T13:40", c: 1016, by: "mehmet", type: "S", items: [["KGN39VIEB", 1], ["WTH85V00TR", 1]], pes: 18000, pay: "Kredi Kartı" },
  { d: "2026-10-14T16:10", c: 1017, by: "ahmet", type: "S", items: [["SMS4IKI51T", 1, 1, "Mutfak tadilatı bitene kadar depoda bekleyecek"]], pes: 17200, pay: "Nakit" },
  { d: "2026-10-16T11:35", c: 1009, by: "ahmet", type: "T", amount: 7000, pay: "Havale" },
  { d: "2026-10-20T15:25", c: 1007, by: "ayse", type: "T", amount: 5000, pay: "Nakit" },
  { d: "2026-10-22T10:00", c: 1014, by: "mehmet", type: "T", amount: 6500, pay: "Kredi Kartı" },
  { d: "2026-10-27T12:45", c: 1018, by: "mehmet", type: "S", items: [["HBF113BR0T-SET", 1, 1, "Dairenin teslimi Kasım'da, o zamana kadar depoda"], ["DVL6020X", 1]], pes: 7400, pay: "Nakit" },
];

/** Üretildiği ana göre değişen (bugün / dün) işlemler: Dashboard "bugün" ve Mağazam "bu ay" verisi boş kalmasın. */
const buildRelativeTxSpecs = (now) => [
  {
    at: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
    c: 1011,
    by: "ahmet",
    type: "T",
    amount: 4800,
    pay: "Nakit",
    not: "Mağazadan elden ödeme",
  },
  {
    at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    c: 1010,
    by: "ahmet",
    type: "S",
    items: [["WGA254A0TR", 1], ["DVL6020X", 1]],
    pes: 14000,
    pay: "Kredi Kartı",
    not: "Mağaza satış",
  },
  {
    at: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
    c: 1018,
    by: "mehmet",
    type: "T",
    amount: 2000,
    pay: "Nakit",
    not: "Kasadan tahsilat",
  },
];

// ─── Mağaza Giderleri (Expenses) ──────────────────────────────────────────────
// [tarih, kategori, tutar, açıklama, personel]
const EXPENSE_SPECS = [
  ["2026-09-05T10:00", "Kira", 28000, "Eylül 2026 mağaza ve depo kira ödemesi", "ahmet"],
  ["2026-09-15T14:20", "Fatura", 4250, "Elektrik, su ve doğalgaz faturaları", "ayse"],
  ["2026-09-25T16:00", "Maaş", 52000, "Eylül 2026 personel maaş ödemeleri", "ahmet"],
  ["2026-10-05T10:30", "Kira", 28000, "Ekim 2026 mağaza ve depo kira ödemesi", "ahmet"],
  ["2026-10-12T11:45", "Malzeme/Hırdavat", 3400, "Montaj aparatları, hortum ve kablo alımı", "zeynep"],
  ["2026-10-18T15:10", "Fatura", 4850, "Ekim ayı elektrik, internet ve su faturaları", "ayse"],
  ["2026-10-28T17:00", "Maaş", 52000, "Ekim 2026 personel maaş ödemeleri", "ahmet"],
];

const buildRelativeExpenseSpecs = (now) => {
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 10, 15, 0).toISOString();
  const recentTime = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  return [
    [firstDay, "Kira", 28000, "Aylık mağaza kira ödemesi", "ahmet"],
    [recentTime, "Malzeme/Hırdavat", 1850, "Sevkiyat ambalaj ve montaj sarf malzemeleri", "ahmet"],
  ];
};

// ─── Stok hareketleri ─────────────────────────────────────────────────────────
// [tarih, ürünKodu, tip, miktar, önceki stok, açıklama, personel]

const STOCK_MOVEMENT_SPECS = [
  ["2025-12-10T09:30", "KGN39VIEB", "Giriş", 12, 0, "Bosch tedarikçi sevkiyatı", "zeynep"],
  ["2026-09-01T09:45", "WGA254A0TR", "Giriş", 15, 10, "Bosch tedarikçi sevkiyatı", "zeynep"],
  ["2026-09-03T10:10", "CM10120TR", "Giriş", 10, 2, "Profilo bölge deposundan mal kabul", "zeynep"],
  ["2026-09-10T11:00", "KG49NXIF0N", "Giriş", 4, 0, "Siemens sevkiyatı", "zeynep"],
  ["2026-09-12T09:20", "WM14N2E0TR", "Giriş", 14, 0, "Siemens sevkiyatı", "zeynep"],
  ["2026-09-15T14:05", "BM4282EG", "Giriş", 6, 0, "Profilo bölge deposundan mal kabul", "zeynep"],
  ["2026-09-20T15:30", "WM14N2E0TR", "Transfer", 2, 14, "Mamak şubeye transfer", "zeynep"],
  ["2026-10-02T10:50", "KG49NXIF0N", "Çıkış", 2, 4, "Hasarlı ürün tedarikçiye iade edildi", "zeynep"],
  ["2026-10-03T09:40", "KGN86AI42N", "Giriş", 3, 2, "Bosch tedarikçi sevkiyatı", "zeynep"],
  ["2026-10-08T16:15", "SMS4IKI51T", "Çıkış", 1, 3, "Teşhir ürünü kullanım dışı bırakıldı", "ahmet"],
  ["2026-10-10T10:25", "WTH85V00TR", "Giriş", 5, 0, "Bosch tedarikçi sevkiyatı", "zeynep"],
  ["2026-10-12T11:15", "SN23HI42MT", "Giriş", 5, 0, "Siemens sevkiyatı", "zeynep"],
  ["2026-10-18T13:00", "BD2056W3VN", "Çıkış", 3, 3, "Fabrika hatası nedeniyle iade", "ayse"],
  ["2026-10-19T09:35", "DVL6020X", "Giriş", 20, 5, "Profilo bölge deposundan mal kabul", "zeynep"],
  ["2026-10-21T14:45", "WT47XM00TR", "Çıkış", 1, 1, "Arızalı ürün servise gönderildi", "zeynep"],
  ["2026-10-24T10:05", "ASP3000X-SET", "Transfer", 3, 15, "Ostim depoya transfer", "zeynep"],
];

// ─── Şubeler, transferler, sevkiyatlar ────────────────────────────────────────

const BRANCH_SPECS = [
  { key: "merkez", ad: "Merkez Mağaza", adres: STORE.adres, telefon: "0312 555 01 01", sorumlu: "ahmet" },
  { key: "mamak", ad: "Mamak Şube", adres: "Mamak Mah. Ankara Cad. No:210, Mamak / Ankara", telefon: "0312 555 02 02", sorumlu: "ayse" },
  { key: "ostim", ad: "Ostim Depo", adres: "Ostim OSB Mah. 1203. Sok. No:20, Yenimahalle / Ankara", telefon: "0312 555 03 03", sorumlu: "zeynep" },
];

const TRANSFER_SPECS = [
  { d: "2026-10-26T10:30", from: "merkez", to: "mamak", by: "zeynep", status: "Beklemede", items: [["CM10120TR", 3]], notes: "Mamak şube vitrin ve stok takviyesi" },
  { d: "2026-10-12T09:15", from: "ostim", to: "merkez", by: "zeynep", status: "Onaylandı", approvedBy: "ahmet", approvedAt: "2026-10-12T15:40", items: [["WGA254A0TR", 10]], notes: "Depodan mağazaya mal sevki" },
  { d: "2026-10-09T13:20", from: "merkez", to: "ostim", by: "mehmet", status: "Reddedildi", approvedBy: "ayse", approvedAt: "2026-10-09T16:10", items: [["WT47XM00TR", 1]], notes: "Ürün serviste olduğu için reddedildi" },
  { d: "2026-10-29T11:45", from: "mamak", to: "merkez", by: "zeynep", status: "Beklemede", items: [["KGN39VIEB", 2]], notes: "Müşteri siparişi için merkeze getirilecek" },
];

const buildShipmentSpecs = (now) => {
  const dayAt = (offsetDays, hour) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, hour, 0, 0).toISOString();

  return [
    {
      deliveryDate: dayAt(0, 14), c: 1016, by: "mehmet", status: "Planlandı",
      items: [["KGN39VIEB", 1], ["WTH85V00TR", 1]],
      vehicle: { plaka: "06 TKY 421", sofor: "Hüseyin Kara", aracTuru: "Kamyonet" },
      personnel: ["zeynep", "mehmet"], notes: "Asansör yok, 4. kat. Teslimattan önce müşteri aranacak.",
      createdAt: dayAt(-1, 17),
    },
    {
      deliveryDate: dayAt(0, 16), c: 1014, by: "ayse", status: "Yolda",
      items: [["HB578A0S0T-SET", 1]],
      vehicle: { plaka: "06 BE 7740", sofor: "Ercan Polat", aracTuru: "Kamyon" },
      personnel: ["zeynep"], notes: "Montaj ekibi de gidecek.",
      createdAt: dayAt(-2, 11),
    },
    {
      deliveryDate: dayAt(1, 11), c: 1012, by: "ayse", status: "Planlandı",
      items: [["KGN86AI42N", 1]],
      vehicle: { plaka: "06 TKY 421", sofor: "Hüseyin Kara", aracTuru: "Kamyonet" },
      personnel: ["zeynep"], notes: "Müşteri taşınma sonrası adresi teyit edecek.",
      createdAt: dayAt(-1, 12),
    },
    {
      deliveryDate: localIso("2026-10-03T11:00"), c: 1015, by: "ayse", status: "Teslim Edildi",
      items: [["CM10120TR", 1], ["BM4282EG", 1]],
      vehicle: { plaka: "06 BE 7740", sofor: "Ercan Polat", aracTuru: "Kamyon" },
      personnel: ["zeynep", "mehmet"], notes: "Teslim edildi, montaj yapıldı.",
      createdAt: localIso("2026-10-01T11:30"),
    },
    {
      deliveryDate: localIso("2026-09-18T10:00"), c: 1013, by: "ahmet", status: "Teslim Edildi",
      items: [["SN23HI42MT", 1], ["WM14N2E0TR", 1]],
      vehicle: { plaka: "06 TKY 421", sofor: "Hüseyin Kara", aracTuru: "Kamyonet" },
      personnel: ["zeynep"], notes: "",
      createdAt: localIso("2026-09-16T13:00"),
    },
    {
      deliveryDate: localIso("2026-10-15T10:00"), c: 1017, by: "ahmet", status: "İptal",
      items: [["SMS4IKI51T", 1]],
      vehicle: { plaka: "", sofor: "", aracTuru: "" },
      personnel: [], notes: "Müşteri tadilat gecikmesi nedeniyle iptal etti.",
      createdAt: localIso("2026-10-14T16:30"),
    },
  ];
};

// ─── Seed üretici ─────────────────────────────────────────────────────────────

export const buildSeedDatabase = (now = new Date()) => {
  let seq = 0;
  const nextId = (prefix) => `${prefix}_${pad4(++seq)}`;

  // Personeller
  const users = USER_SPECS.map((spec) => {
    const isAdmin = spec.role === "admin";
    return {
      _id: `usr_${spec.key}`,
      id: `usr_${spec.key}`,
      tenantId: STORE_ID,
      ad: spec.ad,
      soyad: spec.soyad,
      email: spec.email,
      password: DEMO_PASSWORD,
      role: spec.role,
      permissions: { ...spec.permissions },
      allowedPages: {
        dashboard: true,
        magazam: isAdmin,
        musteriler: true,
        "urun-stok": true,
        envanter: true,
        "musteri-finans": true,
        raporlar: true,
        personeller: isAdmin,
      },
      pageLocks: {
        ...NO_LOCKS,
        magazam: !isAdmin,
        personeller: !isAdmin,
      },
      pagePasswords: { finans: "", stok: "", raporlar: "", envanter: "", transferler: "" },
      isDeleted: false,
      createdAt: localIso(spec.createdAt),
      updatedAt: localIso(spec.createdAt),
    };
  });
  const userByKey = Object.fromEntries(USER_SPECS.map((s, i) => [s.key, users[i]]));
  const fullName = (u) => `${u.ad} ${u.soyad}`;

  // Ürünler
  const products = PRODUCT_SPECS.map(
    ([code, ad, marka, kategori, alis, satis, stok, kritik, garanti, eklenme], index) => ({
      _id: `prd_${code}`,
      id: `prd_${code}`,
      tenantId: STORE_ID,
      createdBy: userByKey.ahmet._id,
      urunKodu: code,
      ad,
      marka,
      kategori,
      barkod: `${BARCODE_PREFIX[marka]}${String(100000 + (index + 1) * 137)}`,
      seriNo: "",
      alisFiyati: alis,
      satisFiyati: satis,
      mevcutStok: stok,
      kritikStokSeviyesi: kritik,
      garantiSuresi: garanti,
      tedarikci: "BSH Ev Aletleri Sanayi ve Ticaret A.Ş.",
      isDeleted: false,
      createdAt: localIso(`${eklenme}T10:00`),
      updatedAt: localIso(`${eklenme}T10:00`),
    }),
  );
  const productByCode = Object.fromEntries(products.map((p) => [p.urunKodu, p]));

  // Stoklar (envanterdekiAdet aşağıda satış satırlarından hesaplanır)
  const stocks = products.map((p) => ({
    _id: `stk_${p.urunKodu}`,
    id: `stk_${p.urunKodu}`,
    tenantId: STORE_ID,
    createdBy: userByKey.zeynep._id,
    urunKodu: p.urunKodu,
    urunAdi: p.ad,
    marka: p.marka,
    kategori: p.kategori,
    alisFiyati: p.alisFiyati,
    satisFiyati: p.satisFiyati,
    adet: p.mevcutStok,
    envanterdekiAdet: 0,
    serialNumbers: [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  const stockByCode = Object.fromEntries(stocks.map((s) => [s.urunKodu, s]));

  // Müşteriler (bakiye ve tarihler işlemlerden doldurulur)
  const customers = CUSTOMER_SPECS.map(([no, ad, soyad, tcBase, telefon, adres]) => {
    const tc = makeTcKimlik(tcBase);
    return {
      _id: `cus_${no}`,
      id: `cus_${no}`,
      tenantId: STORE_ID,
      createdBy: userByKey.mehmet._id,
      musteriNo: no,
      ad,
      soyad,
      tcKimlik: tc,
      tc,
      telefon,
      adres,
      toplamKalanBakiye: 0,
      kalanBorc: 0,
      installments: [],
      kayitTarihi: "",
      sonIslemTarihi: "",
      isDeleted: false,
      createdAt: "",
      updatedAt: "",
    };
  });
  const customerByNo = Object.fromEntries(customers.map((c) => [c.musteriNo, c]));

  // İşlemler
  const allTxSpecs = [...TX_SPECS, ...buildRelativeTxSpecs(now)]
    .map((spec) => ({ ...spec, at: spec.at ?? localIso(spec.d) }))
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  const transactions = [];
  const collections = [];
  const actionLogs = [];

  const pushLog = (action, entityType, entityId, actor, details, at) => {
    actionLogs.push({
      _id: nextId("log"),
      tenantId: STORE_ID,
      userId: actor._id,
      userName: fullName(actor),
      action,
      entityType,
      entityId,
      details,
      createdAt: at,
      updatedAt: at,
    });
  };

  allTxSpecs.forEach((spec) => {
    const customer = customerByNo[spec.c];
    const actor = userByKey[spec.by];
    const isSale = spec.type === "S";
    const customerName = `${customer.ad} ${customer.soyad}`;

    // İlk işlem: müşteri kaydı
    if (!customer.createdAt) {
      const registeredAt = new Date(new Date(spec.at).getTime() - 5 * 60 * 1000).toISOString();
      customer.createdAt = registeredAt;
      customer.kayitTarihi = registeredAt;
      pushLog("MUSTERI_EKLE", "Customer", customer._id, actor, { ad: customer.ad, soyad: customer.soyad, musteriNo: customer.musteriNo }, registeredAt);
    }

    const txId = nextId("tx");
    let record;

    if (isSale) {
      const lines = spec.items.map(([code, qty, pending = 0, note = ""]) => {
        const product = productByCode[code];
        stockByCode[code].envanterdekiAdet += pending;
        return {
          urunKodu: code,
          urunAdi: product.ad,
          marka: product.marka,
          adet: qty,
          alisFiyati: product.alisFiyati,
          birimFiyat: product.satisFiyati,
          toplamMaliyet: round2(product.alisFiyati * qty),
          envanterdeBekleyenAdet: pending,
          envanterdeMi: pending > 0,
          envanterAciklamasi: pending > 0 ? note : "",
        };
      });

      const total = spec.total ?? lines.reduce((sum, l) => sum + l.birimFiyat * l.adet, 0);
      const totalCost = round2(lines.reduce((sum, l) => sum + l.alisFiyati * l.adet, 0));
      const pesinat = Math.min(spec.pes, total);
      const remaining = round2(Math.max(0, total - pesinat));
      customer.toplamKalanBakiye = round2(customer.toplamKalanBakiye + remaining);

      record = {
        urunler: lines,
        urunBilgisi: lines.map((l) => `${l.urunKodu} (x${l.adet})`).join(", "),
        islemTuru: "Satış",
        islemTipi: "SATIS",
        toplamTutar: total,
        toplamMaliyet: totalCost,
        pesinat,
        kalanHesap: remaining,
        alinanTutar: pesinat,
        // Satışta kalan borç = müşteriye bu işlemle yazılan borç
        kalanBorc: remaining,
      };

      pushLog("SATIS_OLUSTUR", "Transaction", txId, actor, {
        musteri: customerName,
        musteriNo: customer.musteriNo,
        urunler: record.urunBilgisi,
        toplamTutar: total,
        pesinat,
        kalanBorc: remaining,
      }, spec.at);
    } else {
      const amount = spec.amount;
      customer.toplamKalanBakiye = round2(Math.max(0, customer.toplamKalanBakiye - amount));

      record = {
        urunler: [],
        urunBilgisi: "İşlem",
        islemTuru: "Tahsilat",
        islemTipi: "TAHSILAT",
        toplamTutar: amount,
        pesinat: amount,
        tutar: amount,
        odenenTutar: amount,
        kalanHesap: customer.toplamKalanBakiye,
        alinanTutar: amount,
        // Tahsilatta kalan borç = tahsilat sonrası müşterinin toplam borcu
        kalanBorc: customer.toplamKalanBakiye,
      };

      pushLog("TAHSILAT_AL", "Transaction", txId, actor, {
        musteri: customerName,
        musteriNo: customer.musteriNo,
        tutar: amount,
        odemeYontemi: spec.pay,
        kalanBorc: customer.toplamKalanBakiye,
      }, spec.at);
    }

    customer.kalanBorc = customer.toplamKalanBakiye;
    customer.sonIslemTarihi = spec.at;
    customer.updatedAt = spec.at;

    transactions.push({
      _id: txId,
      id: txId,
      tenantId: STORE_ID,
      createdBy: actor._id,
      personelAdi: fullName(actor),
      musteriId: customer._id,
      musteriAdSoyad: customerName,
      musteriNo: customer.musteriNo,
      tarih: spec.at,
      ...record,
      musteriBakiyeSonrasi: customer.toplamKalanBakiye,
      odemeYontemi: spec.pay,
      aciklama: spec.not || "",
      installments: [],
      isDeleted: false,
      createdAt: spec.at,
      updatedAt: spec.at,
    });

    // Kasa kaydı (peşinat veya tahsilat)
    const collected = isSale ? record.pesinat : spec.amount;
    if (collected > 0) {
      collections.push({
        _id: nextId("col"),
        tenantId: STORE_ID,
        customerId: customer._id,
        transactionId: txId,
        installmentId: null,
        amount: collected,
        collectedBy: actor._id,
        collectedByName: fullName(actor),
        paymentMethod: paymentMethodMap[spec.pay] || "Diğer",
        collectionDate: spec.at,
        notes: isSale ? "Satış peşinatı" : spec.not || "Tahsilat",
        kaynak: isSale ? "SATIS_PESINAT" : "TAHSILAT",
        isDeleted: false,
        createdAt: spec.at,
        updatedAt: spec.at,
      });
    }
  });

  // Stok hareketleri
  const stockHistory = STOCK_MOVEMENT_SPECS.map(([date, code, type, qty, before, note, by]) => {
    const product = productByCode[code];
    const actor = userByKey[by];
    const at = localIso(date);
    const after = type === "Giriş" ? before + qty : before - qty;
    const id = nextId("mov");

    pushLog("STOK_HAREKET", "StockHistory", id, actor, {
      urun: product.ad,
      urunKodu: code,
      hareketTipi: type,
      miktar: qty,
    }, at);

    return {
      _id: id,
      id,
      tenantId: STORE_ID,
      performedBy: actor._id,
      productId: product._id,
      urunKodu: code,
      hareketTipi: type,
      miktar: qty,
      oncekiStok: before,
      sonrakiStok: after,
      aciklama: note,
      isDeleted: false,
      cancelledBy: null,
      cancelledAt: null,
      createdAt: at,
      updatedAt: at,
    };
  });

  // Ürün / personel ekleme günlükleri
  products.forEach((p) =>
    pushLog("URUN_EKLE", "Product", p._id, userByKey.ahmet, { ad: p.ad, urunKodu: p.urunKodu }, p.createdAt),
  );
  users.forEach((u) =>
    pushLog("KULLANICI_EKLE", "User", u._id, userByKey.ahmet, { ad: u.ad, soyad: u.soyad, role: u.role }, u.createdAt),
  );

  // Şubeler
  const branches = BRANCH_SPECS.map((spec) => ({
    _id: `brn_${spec.key}`,
    id: `brn_${spec.key}`,
    tenantId: STORE_ID,
    ad: spec.ad,
    adres: spec.adres,
    telefon: spec.telefon,
    sorumluPersonel: userByKey[spec.sorumlu]._id,
    isActive: true,
    createdBy: userByKey.ahmet._id,
    createdAt: localIso("2024-01-03T10:00"),
    updatedAt: localIso("2024-01-03T10:00"),
  }));

  // Transferler
  const transfers = TRANSFER_SPECS.map((spec) => {
    const at = localIso(spec.d);
    const id = nextId("trf");
    return {
      _id: id,
      id,
      tenantId: STORE_ID,
      fromBranch: `brn_${spec.from}`,
      toBranch: `brn_${spec.to}`,
      products: spec.items.map(([code, qty]) => ({
        urunKodu: code,
        urunAdi: productByCode[code].ad,
        adet: qty,
      })),
      status: spec.status,
      createdBy: userByKey[spec.by]._id,
      approvedBy: spec.approvedBy ? userByKey[spec.approvedBy]._id : null,
      approvedAt: spec.approvedAt ? localIso(spec.approvedAt) : null,
      notes: spec.notes,
      createdAt: at,
      updatedAt: at,
    };
  });

  // Sevkiyatlar
  const shipments = buildShipmentSpecs(now).map((spec) => {
    const id = nextId("shp");
    return {
      _id: id,
      id,
      tenantId: STORE_ID,
      customerId: customerByNo[spec.c]._id,
      products: spec.items.map(([code, qty]) => ({
        urunKodu: code,
        urunAdi: productByCode[code].ad,
        adet: qty,
      })),
      deliveryDate: spec.deliveryDate,
      vehicleInfo: spec.vehicle,
      assignedPersonnel: spec.personnel.map((key) => userByKey[key]._id),
      status: spec.status,
      createdBy: userByKey[spec.by]._id,
      notes: spec.notes,
      createdAt: spec.createdAt,
      updatedAt: spec.createdAt,
    };
  });

  // Mağaza Giderleri
  const allExpenseSpecs = [
    ...EXPENSE_SPECS.map(([d, cat, amt, desc, by]) => [localIso(d), cat, amt, desc, by]),
    ...buildRelativeExpenseSpecs(now),
  ];
  const expenses = allExpenseSpecs.map(([at, category, amount, description, by]) => {
    const id = nextId("exp");
    const actor = userByKey[by] || userByKey.ahmet;
    return {
      _id: id,
      id,
      tenantId: STORE_ID,
      storeId: STORE_ID,
      amount: round2(Number(amount)),
      date: at,
      category,
      description,
      createdBy: actor._id,
      createdByName: fullName(actor),
      isDeleted: false,
      createdAt: at,
      updatedAt: at,
    };
  });

  const sortByDateAsc = (list) => list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return {
    version: DB_VERSION,
    seededAt: now.toISOString(),
    stores: [STORE],
    users,
    products,
    stocks,
    stockHistory: sortByDateAsc(stockHistory),
    customers,
    transactions: sortByDateAsc(transactions),
    collections: sortByDateAsc(collections),
    installments: [],
    expenses: sortByDateAsc(expenses),
    actionLogs: sortByDateAsc(actionLogs),
    branches,
    transfers,
    shipments,
  };
};
