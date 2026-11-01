const bcrypt = require("bcrypt");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Product = require("../models/Product");
const Stock = require("../models/Stock");
const StockHistory = require("../models/StockHistory");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const Collection = require("../models/Collection");
const Expense = require("../models/Expense");
const ActionLog = require("../models/ActionLog");
const { DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD } = require("./constants");
const { round2 } = require("./helpers");
const {
  ALL_PAGES_ALLOWED,
  DEFAULT_STAFF_ALLOWED_PAGES,
  allowedPagesToPageLocks,
  allPermissions,
} = require("./rbac");

const localIso = (value) =>
  new Date(value.length === 10 ? `${value}T10:00:00` : `${value}:00`).toISOString();

const makeTcKimlik = (base9) => {
  const d = base9.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = (d.reduce((sum, n) => sum + n, 0) + d10) % 10;
  return `${base9}${d10}${d11}`;
};

const USER_SPECS = [
  {
    key: "musab",
    ad: "Musab",
    soyad: "Arıkan",
    email: DEMO_OWNER_EMAIL,
    role: "admin",
    isStoreOwner: true,
    permissions: allPermissions(true),
    allowedPages: ALL_PAGES_ALLOWED,
    createdAt: "2024-01-02T09:10",
  },
  {
    key: "ayse",
    ad: "Ayşe",
    soyad: "Demir",
    email: "ayse.demir@magaza.com",
    role: "yonetici",
    isStoreOwner: false,
    permissions: allPermissions(true),
    allowedPages: DEFAULT_STAFF_ALLOWED_PAGES,
    createdAt: "2024-01-02T09:20",
  },
  {
    key: "mehmet",
    ad: "Mehmet",
    soyad: "Kaya",
    email: "mehmet.kaya@magaza.com",
    role: "kasiyer",
    isStoreOwner: false,
    permissions: {
      ...allPermissions(false),
      satisYapabilir: true,
      tahsilatAlabilir: true,
    },
    allowedPages: DEFAULT_STAFF_ALLOWED_PAGES,
    createdAt: "2024-01-05T10:00",
  },
  {
    key: "zeynep",
    ad: "Zeynep",
    soyad: "Çelik",
    email: "zeynep.celik@magaza.com",
    role: "depo_sorumlusu",
    isStoreOwner: false,
    permissions: {
      ...allPermissions(false),
      stokDuzenleyebilir: true,
      envanterDuzenleyebilir: true,
    },
    allowedPages: DEFAULT_STAFF_ALLOWED_PAGES,
    createdAt: "2024-01-08T11:30",
  },
];

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

const TX_SPECS = [
  { d: "2023-11-15T11:20", c: 1002, by: "musab", type: "S", items: [["BM4282EG", 1]], pes: 8000, pay: "Nakit" },
  { d: "2023-12-18T14:45", c: 1002, by: "mehmet", type: "T", amount: 6600, pay: "Nakit", not: "2023 kalan borç kapatıldı" },

  { d: "2024-01-12T10:35", c: 1001, by: "mehmet", type: "S", items: [["KGN86AI42N", 1]], pes: 15000, pay: "Nakit" },
  { d: "2024-01-20T16:40", c: 1002, by: "ayse", type: "S", items: [["CM10120TR", 1]], pes: 16900, pay: "Kredi Kartı" },
  { d: "2024-02-03T12:15", c: 1003, by: "mehmet", type: "S", items: [["SMS4IKI51T", 1]], pes: 10000, pay: "Nakit" },
  { d: "2024-02-09T14:20", c: 1001, by: "mehmet", type: "T", amount: 8000, pay: "Havale", not: "Havale ile kısmi ödeme" },
  { d: "2024-03-15T11:05", c: 1001, by: "ayse", type: "T", amount: 5500, pay: "Nakit", not: "Kalan borç kapatıldı" },
  { d: "2024-03-18T09:50", c: 1004, by: "musab", type: "S", items: [["HBF113BR0T-SET", 1]], pes: 20000, pay: "Havale" },
  { d: "2024-04-11T15:30", c: 1003, by: "musab", type: "T", amount: 7200, pay: "Nakit", not: "Kalan borç kapatıldı" },
  { d: "2024-05-20T13:10", c: 1004, by: "mehmet", type: "T", amount: 12900, pay: "Havale", not: "Kalan borç kapatıldı" },
  { d: "2024-06-05T17:25", c: 1005, by: "ayse", type: "S", items: [["WAN24180TR", 1], ["BM4282EG", 1]], pes: 12000, pay: "Kredi Kartı" },
  { d: "2024-09-14T11:45", c: 1005, by: "mehmet", type: "T", amount: 10000, pay: "Nakit" },
  { d: "2024-12-02T10:20", c: 1005, by: "ayse", type: "T", amount: 8000, pay: "Havale", not: "Kalan borç kapatıldı" },

  { d: "2025-02-10T11:30", c: 1006, by: "mehmet", type: "S", items: [["WM14N2E0TR", 1], ["DVL6020X", 1]], pes: 10000, pay: "Nakit" },
  { d: "2025-02-14T14:05", c: 1007, by: "ayse", type: "S", items: [["KG49NXIF0N", 1], ["WT47XM00TR", 1]], pes: 20000, pay: "Kredi Kartı" },
  { d: "2025-03-28T15:40", c: 1006, by: "mehmet", type: "T", amount: 8000, pay: "Nakit" },
  { d: "2025-05-22T10:10", c: 1008, by: "musab", type: "S", items: [["KGN39VIEB", 1]], pes: 24900, pay: "Havale" },
  { d: "2025-06-16T12:00", c: 1006, by: "musab", type: "T", amount: 8900, pay: "Kredi Kartı", not: "Kalan borç kapatıldı" },
  { d: "2025-07-09T16:30", c: 1007, by: "mehmet", type: "T", amount: 12000, pay: "Havale" },
  { d: "2025-09-08T13:25", c: 1009, by: "mehmet", type: "S", items: [["BD2056W3VN", 1], ["KMP8120TR", 1]], pes: 15000, pay: "Nakit" },
  { d: "2025-11-30T11:50", c: 1010, by: "ayse", type: "S", items: [["ASP3000X-SET", 1]], pes: 27500, pay: "Kredi Kartı" },
  { d: "2025-12-18T14:15", c: 1007, by: "musab", type: "T", amount: 6000, pay: "Nakit" },
  { d: "2025-12-22T10:40", c: 1009, by: "mehmet", type: "T", amount: 5000, pay: "Nakit" },

  { d: "2026-09-02T10:15", c: 1011, by: "mehmet", type: "S", items: [["WGA254A0TR", 2, 2, "Ev tadilatı bitene kadar depoda bekleyecek"]], pes: 15000, pay: "Nakit" },
  { d: "2026-09-09T15:55", c: 1012, by: "ayse", type: "S", items: [["KGN86AI42N", 1, 1, "Yeni eve taşınınca teslim edilecek"], ["DVL6020X", 1]], pes: 10000, pay: "Kredi Kartı" },
  { d: "2026-09-16T12:30", c: 1013, by: "musab", type: "S", items: [["SN23HI42MT", 1], ["WM14N2E0TR", 1]], pes: 41800, pay: "Havale" },
  { d: "2026-09-23T17:05", c: 1014, by: "mehmet", type: "S", items: [["HB578A0S0T-SET", 1]], pes: 12000, pay: "Nakit" },
  { d: "2026-09-28T11:20", c: 1011, by: "ayse", type: "T", amount: 8000, pay: "Havale" },
  { d: "2026-10-01T10:45", c: 1015, by: "ayse", type: "S", items: [["CM10120TR", 1], ["BM4282EG", 1]], pes: 8000, pay: "Nakit" },
  { d: "2026-10-05T14:50", c: 1012, by: "mehmet", type: "T", amount: 5000, pay: "Nakit" },
  { d: "2026-10-07T13:40", c: 1016, by: "mehmet", type: "S", items: [["KGN39VIEB", 1], ["WTH85V00TR", 1]], pes: 18000, pay: "Kredi Kartı" },
  { d: "2026-10-14T16:10", c: 1017, by: "musab", type: "S", items: [["SMS4IKI51T", 1, 1, "Mutfak tadilatı bitene kadar depoda bekleyecek"]], pes: 17200, pay: "Nakit" },
  { d: "2026-10-16T11:35", c: 1009, by: "musab", type: "T", amount: 7000, pay: "Havale" },
  { d: "2026-10-20T15:25", c: 1007, by: "ayse", type: "T", amount: 5000, pay: "Nakit" },
  { d: "2026-10-22T10:00", c: 1014, by: "mehmet", type: "T", amount: 6500, pay: "Kredi Kartı" },
  { d: "2026-10-27T12:45", c: 1018, by: "mehmet", type: "S", items: [["HBF113BR0T-SET", 1, 1, "Dairenin teslimi Kasım'da, o zamana kadar depoda"], ["DVL6020X", 1]], pes: 7400, pay: "Nakit" },
];

const buildRelativeTxSpecs = (now) => [
  {
    at: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
    c: 1011,
    by: "musab",
    type: "T",
    amount: 4800,
    pay: "Nakit",
    not: "Mağazadan elden ödeme",
  },
  {
    at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    c: 1010,
    by: "musab",
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

const EXPENSE_SPECS = [
  ["2026-09-05T10:00", "Kira", 28000, "Eylül 2026 mağaza ve depo kira ödemesi", "musab"],
  ["2026-09-15T14:20", "Fatura", 4250, "Elektrik, su ve doğalgaz faturaları", "ayse"],
  ["2026-09-25T16:00", "Maaş", 52000, "Eylül 2026 personel maaş ödemeleri", "musab"],
  ["2026-10-05T10:30", "Kira", 28000, "Ekim 2026 mağaza ve depo kira ödemesi", "musab"],
  ["2026-10-12T11:45", "Malzeme/Hırdavat", 3400, "Montaj aparatları, hortum ve kablo alımı", "zeynep"],
  ["2026-10-18T15:10", "Fatura", 4850, "Ekim ayı elektrik, internet ve su faturaları", "ayse"],
  ["2026-10-28T17:00", "Maaş", 52000, "Ekim 2026 personel maaş ödemeleri", "musab"],
];

const buildRelativeExpenseSpecs = (now) => {
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 10, 15, 0).toISOString();
  const recentTime = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  return [
    [firstDay, "Kira", 28000, "Aylık mağaza kira ödemesi", "musab"],
    [recentTime, "Malzeme/Hırdavat", 1850, "Sevkiyat ambalaj ve montaj sarf malzemeleri", "musab"],
  ];
};

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
  ["2026-10-08T16:15", "SMS4IKI51T", "Çıkış", 1, 3, "Teşhir ürünü kullanım dışı bırakıldı", "musab"],
  ["2026-10-10T10:25", "WTH85V00TR", "Giriş", 5, 0, "Bosch tedarikçi sevkiyatı", "zeynep"],
  ["2026-10-12T11:15", "SN23HI42MT", "Giriş", 5, 0, "Siemens sevkiyatı", "zeynep"],
  ["2026-10-18T13:00", "BD2056W3VN", "Çıkış", 3, 3, "Fabrika hatası nedeniyle iade", "ayse"],
  ["2026-10-19T09:35", "DVL6020X", "Giriş", 20, 5, "Profilo bölge deposundan mal kabul", "zeynep"],
  ["2026-10-21T14:45", "WT47XM00TR", "Çıkış", 1, 1, "Arızalı ürün servise gönderildi", "zeynep"],
  ["2026-10-24T10:05", "ASP3000X-SET", "Transfer", 3, 15, "Ostim depoya transfer", "zeynep"],
];

const seedDemoTenant = async () => {
  const now = new Date();
  const hashedPassword = await bcrypt.hash(DEMO_OWNER_PASSWORD, 10);

  let ownerUser = await User.findOne({ email: DEMO_OWNER_EMAIL, isDeleted: false });
  let tenant = ownerUser ? await Tenant.findById(ownerUser.tenantId) : null;

  if (!tenant) {
    tenant = await Tenant.findOne({ email: DEMO_OWNER_EMAIL });
  }

  if (tenant && ownerUser) {
    const existingProductCount = await Product.countDocuments({
      tenantId: tenant._id,
      isDeleted: false,
    });
    const existingCustomerCount = await Customer.countDocuments({
      tenantId: tenant._id,
      isDeleted: false,
    });

    if (existingProductCount > 0 && existingCustomerCount > 0) {
      // Idempotent kontrol: zaten yüklü, sadece kurucu bilgilerini garanti altına al
      tenant.name = tenant.name || "Arıkan Mağazası";
      tenant.ownerName = tenant.ownerName || "Musab Arıkan";
      tenant.email = DEMO_OWNER_EMAIL;
      tenant.emailDomain = "magaza.com";
      tenant.isActive = true;
      await tenant.save();

      ownerUser.isStoreOwner = true;
      ownerUser.role = "admin";
      ownerUser.allowedPages = { ...ALL_PAGES_ALLOWED };
      ownerUser.pageLocks = allowedPagesToPageLocks(ALL_PAGES_ALLOWED);
      ownerUser.markModified("allowedPages");
      ownerUser.markModified("pageLocks");
      await ownerUser.save();

      return { seeded: false, tenantId: tenant._id, ownerEmail: DEMO_OWNER_EMAIL };
    }
  }

  if (!tenant) {
    tenant = await Tenant.create({
      name: "Arıkan Mağazası",
      ownerName: "Musab Arıkan",
      email: DEMO_OWNER_EMAIL,
      emailDomain: "magaza.com",
      phone: "0312 555 01 01",
      address: "Kızılay Mah. Atatürk Bulvarı No:112, Çankaya / Ankara",
      customBrands: [],
      customCategories: [],
      customPaymentMethods: [],
      isActive: true,
    });
  } else {
    tenant.name = "Arıkan Mağazası";
    tenant.ownerName = "Musab Arıkan";
    tenant.email = DEMO_OWNER_EMAIL;
    tenant.emailDomain = "magaza.com";
    tenant.phone = tenant.phone || "0312 555 01 01";
    tenant.address =
      tenant.address || "Kızılay Mah. Atatürk Bulvarı No:112, Çankaya / Ankara";
    tenant.isActive = true;
    await tenant.save();
  }

  const tenantId = tenant._id;

  // Varsa bu mağazanın yarım kalmış verilerini temizle
  await Promise.all([
    Product.deleteMany({ tenantId }),
    Stock.deleteMany({ tenantId }),
    StockHistory.deleteMany({ tenantId }),
    Customer.deleteMany({ tenantId }),
    Transaction.deleteMany({ tenantId }),
    Collection.deleteMany({ tenantId }),
    Expense.deleteMany({ tenantId }),
    ActionLog.deleteMany({ tenantId }),
  ]);

  // 1) Personeller (@magaza.com)
  const userByKey = {};
  for (const spec of USER_SPECS) {
    let user = await User.findOne({ email: spec.email });
    if (user) {
      user.tenantId = tenantId;
      user.ad = spec.ad;
      user.soyad = spec.soyad;
      user.password = hashedPassword;
      user.role = spec.role;
      user.isStoreOwner = spec.isStoreOwner;
      user.permissions = spec.permissions;
      user.allowedPages = { ...spec.allowedPages };
      user.pageLocks = allowedPagesToPageLocks(spec.allowedPages);
      user.isDeleted = false;
      user.markModified("permissions");
      user.markModified("allowedPages");
      user.markModified("pageLocks");
      await user.save();
    } else {
      user = await User.create({
        tenantId,
        ad: spec.ad,
        soyad: spec.soyad,
        email: spec.email,
        password: hashedPassword,
        role: spec.role,
        isStoreOwner: spec.isStoreOwner,
        permissions: spec.permissions,
        allowedPages: { ...spec.allowedPages },
        pageLocks: allowedPagesToPageLocks(spec.allowedPages),
        pagePasswords: { userManagement: "", reports: "", myStore: "" },
        isDeleted: false,
        createdAt: localIso(spec.createdAt),
        updatedAt: localIso(spec.createdAt),
      });
    }
    userByKey[spec.key] = user;
  }

  // 2) Ürünler ve Stoklar
  const productByCode = {};
  const stockDataByCode = {};

  for (let i = 0; i < PRODUCT_SPECS.length; i += 1) {
    const [code, ad, marka, kategori, alis, satis, stok, kritik, garanti, eklenme] =
      PRODUCT_SPECS[i];
    const createdAt = localIso(`${eklenme}T10:00`);
    const barkod = `${BARCODE_PREFIX[marka]}${String(100000 + (i + 1) * 137)}`;

    const product = await Product.create({
      tenantId,
      createdBy: userByKey.musab._id,
      urunKodu: code,
      ad,
      marka,
      kategori,
      barkod,
      seriNo: "",
      alisFiyati: alis,
      satisFiyati: satis,
      mevcutStok: stok,
      kritikStokSeviyesi: kritik,
      garantiSuresi: garanti,
      tedarikci: "BSH Ev Aletleri Sanayi ve Ticaret A.Ş.",
      isDeleted: false,
      createdAt,
      updatedAt: createdAt,
    });

    productByCode[code] = product;
    stockDataByCode[code] = {
      tenantId,
      createdBy: userByKey.zeynep._id,
      urunKodu: code,
      urunAdi: ad,
      marka,
      kategori,
      alisFiyati: alis,
      satisFiyati: satis,
      adet: stok,
      envanterdekiAdet: 0,
      serialNumbers: [],
      createdAt,
      updatedAt: createdAt,
    };
  }

  // 3) Müşteriler
  const customerStateByNo = {};
  for (const [no, ad, soyad, tcBase, telefon, adres] of CUSTOMER_SPECS) {
    const tc = makeTcKimlik(tcBase);
    const customer = await Customer.create({
      tenantId,
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
      isDeleted: false,
    });
    customerStateByNo[no] = {
      doc: customer,
      balance: 0,
      firstAt: null,
      lastAt: null,
    };
  }

  // 4) İşlemler ve Kasa (Tahsilat / Peşinat)
  const allTxSpecs = [...TX_SPECS, ...buildRelativeTxSpecs(now)]
    .map((spec) => ({ ...spec, at: spec.at ?? localIso(spec.d) }))
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  const txDocsToInsert = [];
  const colDocsToInsert = [];

  for (const spec of allTxSpecs) {
    const cState = customerStateByNo[spec.c];
    const customer = cState.doc;
    const actor = userByKey[spec.by] || userByKey.musab;
    const actorFullName = `${actor.ad} ${actor.soyad}`;
    const customerName = `${customer.ad} ${customer.soyad}`;
    const isSale = spec.type === "S";

    if (!cState.firstAt) {
      cState.firstAt = new Date(new Date(spec.at).getTime() - 5 * 60 * 1000).toISOString();
    }
    cState.lastAt = spec.at;

    let txData;
    let collectedAmount = 0;

    if (isSale) {
      const lines = spec.items.map(([code, qty, pending = 0, note = ""]) => {
        const product = productByCode[code];
        stockDataByCode[code].envanterdekiAdet += pending;
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
      cState.balance = round2(cState.balance + remaining);
      collectedAmount = pesinat;

      txData = {
        tenantId,
        createdBy: actor._id,
        personelAdi: actorFullName,
        musteriId: customer._id,
        musteriAdSoyad: customerName,
        musteriNo: customer.musteriNo,
        tarih: spec.at,
        urunler: lines,
        urunBilgisi: lines.map((l) => `${l.urunKodu} (x${l.adet})`).join(", "),
        islemTuru: "Satış",
        islemTipi: "SATIS",
        toplamTutar: total,
        toplamMaliyet: totalCost,
        pesinat,
        kalanHesap: remaining,
        alinanTutar: pesinat,
        kalanBorc: remaining,
        musteriBakiyeSonrasi: cState.balance,
        odemeYontemi: spec.pay,
        aciklama: spec.not || "",
        isDeleted: false,
        createdAt: spec.at,
        updatedAt: spec.at,
      };
    } else {
      const amount = spec.amount;
      cState.balance = round2(Math.max(0, cState.balance - amount));
      collectedAmount = amount;

      txData = {
        tenantId,
        createdBy: actor._id,
        personelAdi: actorFullName,
        musteriId: customer._id,
        musteriAdSoyad: customerName,
        musteriNo: customer.musteriNo,
        tarih: spec.at,
        urunler: [],
        urunBilgisi: "İşlem",
        islemTuru: "Tahsilat",
        islemTipi: "TAHSILAT",
        toplamTutar: amount,
        toplamMaliyet: 0,
        pesinat: amount,
        tutar: amount,
        odenenTutar: amount,
        kalanHesap: cState.balance,
        alinanTutar: amount,
        kalanBorc: cState.balance,
        musteriBakiyeSonrasi: cState.balance,
        odemeYontemi: spec.pay,
        aciklama: spec.not || "",
        isDeleted: false,
        createdAt: spec.at,
        updatedAt: spec.at,
      };
    }

    const createdTx = await Transaction.create(txData);
    txDocsToInsert.push(createdTx);

    if (collectedAmount > 0) {
      colDocsToInsert.push({
        tenantId,
        customerId: customer._id,
        transactionId: createdTx._id,
        amount: collectedAmount,
        collectedBy: actor._id,
        collectedByName: actorFullName,
        paymentMethod: spec.pay,
        collectionDate: spec.at,
        notes: isSale ? "Satış peşinatı" : spec.not || "Tahsilat",
        kaynak: isSale ? "SATIS_PESINAT" : "TAHSILAT",
        isDeleted: false,
        createdAt: spec.at,
        updatedAt: spec.at,
      });
    }
  }

  if (colDocsToInsert.length > 0) {
    await Collection.insertMany(colDocsToInsert);
  }

  // Müşteri bakiyelerini ve Stok envanterdekiAdet değerlerini kaydet
  for (const state of Object.values(customerStateByNo)) {
    state.doc.toplamKalanBakiye = state.balance;
    state.doc.kalanBorc = state.balance;
    if (state.firstAt) {
      state.doc.kayitTarihi = state.firstAt;
      state.doc.createdAt = state.firstAt;
    }
    if (state.lastAt) {
      state.doc.sonIslemTarihi = state.lastAt;
      state.doc.updatedAt = state.lastAt;
    }
    await state.doc.save();
  }

  await Stock.insertMany(Object.values(stockDataByCode));

  // 5) Stok Hareketleri
  const stockMovementsToInsert = STOCK_MOVEMENT_SPECS.map(
    ([date, code, type, qty, before, note, by]) => {
      const product = productByCode[code];
      const actor = userByKey[by] || userByKey.zeynep;
      const at = localIso(date);
      const after = type === "Giriş" ? before + qty : before - qty;
      return {
        tenantId,
        performedBy: actor._id,
        productId: product._id,
        urunKodu: code,
        hareketTipi: type,
        miktar: qty,
        oncekiStok: before,
        sonrakiStok: after,
        aciklama: note,
        isDeleted: false,
        createdAt: at,
        updatedAt: at,
      };
    },
  );
  await StockHistory.insertMany(stockMovementsToInsert);

  // 6) Mağaza Giderleri
  const allExpenseSpecs = [
    ...EXPENSE_SPECS.map(([d, cat, amt, desc, by]) => [localIso(d), cat, amt, desc, by]),
    ...buildRelativeExpenseSpecs(now),
  ];
  const expensesToInsert = allExpenseSpecs.map(([at, category, amount, description, by]) => {
    const actor = userByKey[by] || userByKey.musab;
    return {
      tenantId,
      storeId: tenantId,
      amount: round2(Number(amount)),
      date: at,
      category,
      description,
      createdBy: actor._id,
      createdByName: `${actor.ad} ${actor.soyad}`,
      isDeleted: false,
      createdAt: at,
      updatedAt: at,
    };
  });
  await Expense.insertMany(expensesToInsert);

  return {
    seeded: true,
    tenantId,
    ownerEmail: DEMO_OWNER_EMAIL,
    productsCount: PRODUCT_SPECS.length,
    customersCount: CUSTOMER_SPECS.length,
    transactionsCount: txDocsToInsert.length,
    expensesCount: expensesToInsert.length,
  };
};

module.exports = { seedDemoTenant };
