const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const Tenant = require("./models/Tenant");
const User = require("./models/User");
const Customer = require("./models/Customer");
const Stock = require("./models/Stock");
const Transaction = require("./models/Transaction");

const TENANT_NAME = "Güneş Mağazası";
const ADMIN_EMAIL = "orhan@gunesmagaza";
const ADMIN_PASSWORD = "123456";

const products = [
  { urunKodu: "PRF-BUZ-450", marka: "Profilo", adet: 8, serialNumbers: ["SN-PRF-450-001", "SN-PRF-450-002"] },
  { urunKodu: "BSH-WAT28461", marka: "Bosch", adet: 12, serialNumbers: [] },
  { urunKodu: "GPA-KUR-700", marka: "Gipa", adet: 5, serialNumbers: [] },
  { urunKodu: "PRF-CMS-9100", marka: "Profilo", adet: 15, serialNumbers: [] },
  { urunKodu: "BSH-BUZ-520", marka: "Bosch", adet: 6, serialNumbers: ["SN-BSH-520-014"] },
  { urunKodu: "GPA-TV-55", marka: "Gipa", adet: 3, serialNumbers: [] },
  { urunKodu: "BSH-KUR-8000", marka: "Bosch", adet: 4, serialNumbers: [] },
  { urunKodu: "PRF-FIR-6600", marka: "Profilo", adet: 10, serialNumbers: [] },
  { urunKodu: "GPA-CM-800", marka: "Gipa", adet: 7, serialNumbers: [] },
  { urunKodu: "BSH-BLS-300", marka: "Bosch", adet: 9, serialNumbers: [] },
];

const customers = [
  {
    ad: "Ahmet",
    soyad: "Yılmaz",
    tcKimlik: "12345678901",
    telefon: "0555 123 4567",
    adres: "Atatürk Mah. Cumhuriyet Cad. No:12 D:4, Merkez / Ankara",
    musteriNo: 1,
  },
  {
    ad: "Ayşe",
    soyad: "Demir",
    tcKimlik: "98765432109",
    telefon: "0532 987 6543",
    adres: "Kızılay Mah. Gazi Cad. No:45, Çankaya / Ankara",
    musteriNo: 2,
  },
  {
    ad: "Mehmet",
    soyad: "Kaya",
    tcKimlik: "45612378901",
    telefon: "0544 456 1237",
    adres: "Yeni Mah. İnönü Bulvarı No:78, Keçiören / Ankara",
    musteriNo: 3,
  },
  {
    ad: "Fatma",
    soyad: "Çelik",
    tcKimlik: "78945612301",
    telefon: "0505 789 4561",
    adres: "Bahçelievler Mah. 7. Cad. No:23, Mamak / Ankara",
    musteriNo: 4,
  },
  {
    ad: "Mustafa",
    soyad: "Şahin",
    tcKimlik: "32165498701",
    telefon: "0533 321 6549",
    adres: "Ostim Sanayi Sitesi 1234. Sok. No:5, Yenimahalle / Ankara",
    musteriNo: 5,
  },
];

const seed = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI ortam değişkeni tanımlı değil.");
  }

  await mongoose.connect(mongoUri);

  const existingTenant = await Tenant.findOne({ name: TENANT_NAME });
  if (existingTenant) {
    const tenantId = existingTenant._id;
    await Promise.all([
      Transaction.deleteMany({ tenantId }),
      Customer.deleteMany({ tenantId }),
      Stock.deleteMany({ tenantId }),
      User.deleteMany({ tenantId }),
      Tenant.deleteOne({ _id: tenantId }),
    ]);
  }

  const tenant = await Tenant.create({
    name: TENANT_NAME,
    isActive: true,
    modules: {
      subeTransfer: false,
    },
  });

  const admin = await User.create({
    tenantId: tenant._id,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
    permissions: {
      musteriSilebilir: true,
      tahsilatAlabilir: true,
      satisYapabilir: true,
      stokDuzenleyebilir: true,
      envanterDuzenleyebilir: true,
    },
    pageLocks: {
      stok: true,
      envanter: false,
      borclular: false,
    },
  });

  const createdProducts = await Stock.insertMany(
    products.map((product) => ({
      ...product,
      tenantId: tenant._id,
      createdBy: admin._id,
      envanterdekiAdet: 0,
    })),
  );

  const createdCustomers = await Customer.insertMany(
    customers.map((customer) => ({
      ...customer,
      tenantId: tenant._id,
      createdBy: admin._id,
      toplamKalanBakiye: 0,
    })),
  );

  const [ahmet, ayse, , fatma, mustafa] = createdCustomers;

  const transactionPayloads = [
    {
      musteri: ahmet,
      islemTuru: "Satış",
      tarih: new Date("2023-09-10"),
      urunler: [{ urunKodu: "PRF-BUZ-450", adet: 1, envanterdeBekleyenAdet: 0, envanterdeMi: false, envanterAciklamasi: "" }],
      toplamTutar: 18000,
      pesinat: 3000,
      kalanHesap: 15000,
      odemeYontemi: "Nakit",
      kayitDefteri: "Ana Defter",
      aciklama: "Profilo buzdolabı satışı",
    },
    {
      musteri: ahmet,
      islemTuru: "Tahsilat",
      tarih: new Date("2023-10-15"),
      urunler: [],
      toplamTutar: 0,
      pesinat: 1000,
      kalanHesap: 0,
      odemeYontemi: "Nakit",
      kayitDefteri: "Ana Defter",
      aciklama: "Kısmi tahsilat",
    },
    {
      musteri: ayse,
      islemTuru: "Satış",
      tarih: new Date("2023-11-01"),
      urunler: [
        {
          urunKodu: "BSH-WAT28461",
          adet: 1,
          envanterdeBekleyenAdet: 1,
          envanterdeMi: true,
          envanterAciklamasi: "Teslimat tarihi bekleniyor",
        },
      ],
      toplamTutar: 15000,
      pesinat: 1200,
      kalanHesap: 13800,
      odemeYontemi: "Kredi Kartı",
      kayitDefteri: "Mağaza Defteri",
      aciklama: "Bosch çamaşır makinesi satışı",
    },
    {
      musteri: fatma,
      islemTuru: "Satış",
      tarih: new Date("2023-07-20"),
      urunler: [{ urunKodu: "GPA-TV-55", adet: 1, envanterdeBekleyenAdet: 0, envanterdeMi: false, envanterAciklamasi: "" }],
      toplamTutar: 8750,
      pesinat: 0,
      kalanHesap: 8750,
      odemeYontemi: "Veresiye",
      kayitDefteri: "Ana Defter",
      aciklama: "Gipa televizyon satışı",
    },
    {
      musteri: mustafa,
      islemTuru: "Satış",
      tarih: new Date("2023-09-05"),
      urunler: [
        { urunKodu: "PRF-CMS-9100", adet: 1, envanterdeBekleyenAdet: 0, envanterdeMi: false, envanterAciklamasi: "" },
        {
          urunKodu: "BSH-KUR-8000",
          adet: 1,
          envanterdeBekleyenAdet: 1,
          envanterdeMi: true,
          envanterAciklamasi: "Çeyizlik - teslimat yaz sonu",
        },
      ],
      toplamTutar: 8500,
      pesinat: 0,
      kalanHesap: 8500,
      odemeYontemi: "Veresiye",
      kayitDefteri: "Toptan Defter",
      aciklama: "Çamaşır ve kurutma makinesi satışı",
    },
  ];

  await Transaction.insertMany(
    transactionPayloads.map(({ musteri, ...payload }) => ({
      ...payload,
      tenantId: tenant._id,
      createdBy: admin._id,
      musteriId: musteri._id,
    })),
  );

  const balances = new Map();
  for (const { musteri, islemTuru, kalanHesap, pesinat } of transactionPayloads) {
    const current = balances.get(String(musteri._id)) || 0;
    if (islemTuru === "Satış") {
      balances.set(String(musteri._id), current + kalanHesap);
    } else {
      balances.set(String(musteri._id), Math.max(0, current - pesinat));
    }
  }

  await Promise.all(
    createdCustomers.map((customer) => {
      const bakiye = balances.get(String(customer._id)) || 0;
      customer.toplamKalanBakiye = bakiye;
      return customer.save();
    }),
  );

  const pendingByCode = new Map();
  for (const payload of transactionPayloads) {
    for (const line of payload.urunler) {
      if (!line.envanterdeMi) continue;
      const key = line.urunKodu;
      pendingByCode.set(key, (pendingByCode.get(key) || 0) + line.envanterdeBekleyenAdet);
    }
  }

  await Promise.all(
    createdProducts.map((product) => {
      const pending = pendingByCode.get(product.urunKodu) || 0;
      if (!pending) return Promise.resolve();
      product.envanterdekiAdet = pending;
      product.adet = Math.max(0, product.adet - pending);
      return product.save();
    }),
  );

  console.log("Seed tamamlandı:");
  console.log(`- Tenant: ${tenant.name}`);
  console.log(`- Kullanıcı: ${admin.email} / ${ADMIN_PASSWORD}`);
  console.log(`- Ürün: ${createdProducts.length}`);
  console.log(`- Müşteri: ${createdCustomers.length}`);
  console.log(`- İşlem: ${transactionPayloads.length}`);
};

seed()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("Seed hatası:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
