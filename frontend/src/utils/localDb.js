/**
 * Lokal Veri Motoru (Mock DB)
 *
 * Backend / MongoDB olmadan, tamamen tarayıcıda çalışan, `localStorage` destekli veritabanı.
 *  - İlk açılışta (localStorage boşsa) `data/mockData.js` içindeki seed verisini yükler.
 *  - Her işlem atomiktir: hata fırlatılırsa hiçbir değişiklik kaydedilmez.
 *  - Fonksiyonlar gerçek bir API gibi Promise döner; hatalar axios benzeri
 *    `error.response.data.message` yapısındadır (mevcut sayfalar bu yapıyı okur).
 *
 * Servis dosyaları yalnızca `localDb.<alan>.<fonksiyon>()` çağırır.
 * Geliştirme sırasında tarayıcı konsolundan: `window.__resetLocalDb()` ile veriler sıfırlanır.
 */

import { buildSeedDatabase, DB_VERSION, STORE_ID } from "../data/mockData.js";
import {
  clearAuthSession,
  getAuthSession,
  isExplicitlyLoggedOut,
  setAuthSession,
} from "./authStorage.js";

const DB_KEY = "tekyonetim_local_db";
const LATENCY_MS = 25;

// ─── Genel yardımcılar ────────────────────────────────────────────────────────

const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const str = (value) => (value ?? "").toString().trim();
const lc = (value) => str(value).toLocaleLowerCase("tr-TR");
const sameId = (a, b) => a !== undefined && a !== null && String(a) === String(b);
const nowIso = () => new Date().toISOString();
const fullName = (person) => `${person?.ad ?? ""} ${person?.soyad ?? ""}`.trim();
const pad2 = (n) => String(n).padStart(2, "0");

const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const createHttpError = (message, status = 400, extraData = {}) => {
  const error = new Error(message);
  error.statusCode = status;
  error.response = { status, data: { message, ...extraData } };
  return error;
};

const slugifyTr = (value = "") =>
  lc(value)
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const isEmailTaken = (db, email, exceptUserId = null) => {
  const normalized = lc(email);
  if (!normalized) return false;
  return db.users.some(
    (u) =>
      !u.isDeleted &&
      (!exceptUserId || !sameId(u._id, exceptUserId)) &&
      lc(u.email) === normalized,
  );
};

export const generateEmailSuggestions = (email, hintText = "", db = null) => {
  const normalized = lc(email);
  const [rawLocal = "kullanici", rawDomain = "tekyonetim.com"] = normalized.split("@");
  const cleanLocal =
    rawLocal
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ş", "s")
      .replaceAll("ı", "i")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c")
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/^[._-]+|[._-]+$/g, "") || "magaza";
  const baseLocal = cleanLocal.replace(/\d+$/, "") || cleanLocal;
  const domain = rawDomain.trim() || "tekyonetim.com";
  const hintSlug = slugifyTr(hintText).slice(0, 12);

  const candidates = [
    `${baseLocal}2@${domain}`,
    `${baseLocal}.magaza@${domain}`,
    `${baseLocal}34@${domain}`,
    ...(hintSlug && !baseLocal.includes(hintSlug)
      ? [`${baseLocal}.${hintSlug}@${domain}`]
      : []),
    `${baseLocal}3@${domain}`,
    `${baseLocal}.ticaret@${domain}`,
    `${baseLocal}06@${domain}`,
    `${baseLocal}2026@${domain}`,
  ];

  const uniqueCandidates = [...new Set(candidates)].filter((c) => c !== normalized);
  if (!db) return uniqueCandidates.slice(0, 4);

  return uniqueCandidates.filter((candidate) => !isEmailTaken(db, candidate)).slice(0, 4);
};

/** "YYYY-MM-DD" (yerel) → [gün başı ms, gün sonu ms] */
const dayBounds = (dateStr) => {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return [
    new Date(y, m - 1, d, 0, 0, 0, 0).getTime(),
    new Date(y, m - 1, d, 23, 59, 59, 999).getTime(),
  ];
};

const todayBounds = () => {
  const t = new Date();
  return dayBounds(`${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`);
};

const inRange = (iso, [start, end]) => {
  const time = new Date(iso).getTime();
  return time >= start && time <= end;
};

/** Form'dan gelen "YYYY-MM-DD" değerine anlık saati ekler; ISO gelirse korur. */
const normalizeDate = (value) => {
  if (!value) return nowIso();
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split("-").map(Number);
    const t = new Date();
    return new Date(y, m - 1, d, t.getHours(), t.getMinutes(), t.getSeconds()).toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? nowIso() : parsed.toISOString();
};

const byDateDesc = (field) => (a, b) => new Date(b[field]) - new Date(a[field]);

// ─── Depolama ─────────────────────────────────────────────────────────────────

let memoryDb = null; // localStorage kullanılamazsa (gizli mod vb.) yedek

const readStorage = () => {
  try {
    return window.localStorage.getItem(DB_KEY);
  } catch {
    return null;
  }
};

const persist = (db) => {
  memoryDb = clone(db);
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.warn("[localDb] localStorage'a yazılamadı, bellek içi çalışılıyor:", error);
  }
};

const loadDb = () => {
  const raw = readStorage();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.version === DB_VERSION) return parsed;
    } catch (error) {
      console.warn("[localDb] Kayıtlı veri okunamadı, seed yeniden yükleniyor:", error);
    }
  } else if (memoryDb) {
    return clone(memoryDb);
  }

  const seeded = buildSeedDatabase();
  persist(seeded);
  return seeded;
};

export const resetLocalDb = () => {
  persist(buildSeedDatabase());
  clearAuthSession();
};

/**
 * Tüm işlemlerin geçtiği tek nokta.
 * `write: true` ise fn başarıyla bittiğinde veritabanı kaydedilir; fn hata
 * fırlatırsa hiçbir şey kaydedilmez (atomik).
 */
const run = async (fn, { write = false } = {}) => {
  await sleep(LATENCY_MS);
  const db = loadDb();
  const result = fn(db);
  if (write) persist(db);
  return clone(result);
};

// ─── Ortak iş kuralları ───────────────────────────────────────────────────────

const getCurrentTenantId = (db = null) => {
  const session = getAuthSession();
  if (session?.tenantId) return session.tenantId;
  if (db && session?.userId) {
    const u = db.users.find((user) => sameId(user._id, session.userId));
    if (u?.tenantId) return u.tenantId;
  }
  return STORE_ID;
};

const inTenant = (item, tenantId = getCurrentTenantId()) =>
  sameId(item?.tenantId || STORE_ID, tenantId);

const getActor = (db) => {
  const session = getAuthSession();
  const user = session && db.users.find((u) => sameId(u._id, session.userId) && !u.isDeleted);
  if (!user) throw createHttpError("Oturum bulunamadı, lütfen tekrar giriş yapın.", 401);
  return user;
};

const touch = (entity) => {
  entity.updatedAt = nowIso();
  return entity;
};

const newEntity = (prefix, fields) => {
  const id = newId(prefix);
  const now = nowIso();
  return {
    _id: id,
    id,
    tenantId: fields.tenantId || getCurrentTenantId(),
    ...fields,
    isDeleted: false,
    createdAt: fields.createdAt ?? now,
    updatedAt: fields.updatedAt ?? now,
  };
};

const logAction = (db, actor, action, entityType, entityId, details = {}, at) => {
  db.actionLogs.push({
    _id: newId("log"),
    tenantId: actor?.tenantId || getCurrentTenantId(db),
    userId: actor?._id,
    userName: fullName(actor) || "Bilinmiyor",
    action,
    entityType,
    entityId,
    details,
    createdAt: at ?? nowIso(),
    updatedAt: at ?? nowIso(),
  });
};

const active = (list, tenantId = getCurrentTenantId()) =>
  list.filter((item) => !item.isDeleted && inTenant(item, tenantId));

const findCustomer = (db, id) =>
  db.customers.find((c) => !c.isDeleted && inTenant(c) && sameId(c._id, id));

/** Müşteriyi _id veya müşteri numarası ile bulur (sevkiyat formu serbest metin ID alır). */
const resolveCustomer = (db, ref) =>
  findCustomer(db, ref) ||
  db.customers.find(
    (c) => !c.isDeleted && inTenant(c) && sameId(c.musteriNo, str(ref).replace(/^#/, "")),
  );

const setBalance = (customer, value) => {
  const next = round2(Math.max(0, value));
  customer.toplamKalanBakiye = next;
  customer.kalanBorc = next;
  return touch(customer);
};

const customerRef = (customer) =>
  customer
    ? {
        _id: customer._id,
        id: customer._id,
        ad: customer.ad,
        soyad: customer.soyad,
        telefon: customer.telefon,
        adres: customer.adres,
        musteriNo: customer.musteriNo,
      }
    : null;

const userRef = (db, id) => {
  const user = db.users.find((u) => sameId(u._id, id));
  return user ? { _id: user._id, id: user._id, ad: user.ad, soyad: user.soyad } : null;
};

const branchRef = (db, id) => {
  const branch = db.branches.find((b) => sameId(b._id, id));
  return branch ? { _id: branch._id, id: branch._id, ad: branch.ad, adres: branch.adres } : null;
};

const productByCode = (db, code) =>
  db.products.find((p) => !p.isDeleted && inTenant(p) && p.urunKodu === code);
const stockByCode = (db, code) =>
  db.stocks.find((s) => inTenant(s) && s.urunKodu === code);

/** Stok değiştiğinde aynı ürün koduna sahip ürün kartını (products) eşitler. */
const syncProductFromStock = (db, stock) => {
  const product = productByCode(db, stock.urunKodu);
  if (product) {
    product.mevcutStok = stock.adet;
    touch(product);
  }
};

/** Ürün kartındaki stok değiştiğinde stok kaydını (stocks) eşitler. */
const syncStockFromProduct = (db, product) => {
  if (!product.urunKodu) return;
  const stock = stockByCode(db, product.urunKodu);
  if (stock) {
    stock.adet = Math.max(num(product.mevcutStok), num(stock.envanterdekiAdet));
    touch(stock);
  }
};

const normalizeFlags = (value, keys) => {
  const flags = Object.fromEntries(keys.map((key) => [key, false]));
  if (!value) return flags;
  if (Array.isArray(value)) {
    value.forEach((key) => {
      if (keys.includes(key)) flags[key] = true;
    });
    return flags;
  }
  keys.forEach((key) => {
    flags[key] = Boolean(value[key]);
  });
  return flags;
};

const PERMISSION_KEYS = [
  "musteriSilebilir",
  "tahsilatAlabilir",
  "satisYapabilir",
  "stokDuzenleyebilir",
  "envanterDuzenleyebilir",
  "zRaporuAlabilir",
  "excelExportEdebilir",
];
const PAGE_LOCK_KEYS = ["stok", "envanter", "borclular", "personeller", "raporlar"];
const PAGE_PASSWORD_KEYS = ["finans", "stok", "raporlar", "envanter", "transferler"];

const ROLE_HIERARCHY = { admin: 4, yonetici: 3, kasiyer: 2, depo_sorumlusu: 2, personel: 1 };
const canManageRole = (actorRole, targetRole) =>
  (ROLE_HIERARCHY[actorRole] ?? 0) > (ROLE_HIERARCHY[targetRole] ?? 0) || actorRole === "admin";

const pagePasswordFlags = (user) =>
  Object.fromEntries(PAGE_PASSWORD_KEYS.map((key) => [key, Boolean(user.pagePasswords?.[key])]));

const sanitizeUser = (user) => {
  // eslint-disable-next-line no-unused-vars
  const { password, pagePasswords, ...rest } = user;
  return { ...rest, hasPagePasswords: pagePasswordFlags(user) };
};

const paymentMethodMap = {
  Nakit: "Nakit",
  "Kredi Kartı": "Kart",
  Kart: "Kart",
  Havale: "Havale",
  EFT: "EFT",
  Çek: "Çek",
};
const toCollectionMethod = (method) => paymentMethodMap[method] || "Diğer";

// ─── Kimlik doğrulama ─────────────────────────────────────────────────────────

const LOGIN_ALIASES = {
  "yonetici@tekyonetim.com": "ahmet.yilmaz@tekyonetim.com",
  yonetici: "ahmet.yilmaz@tekyonetim.com",
  admin: "ahmet.yilmaz@tekyonetim.com",
  "personel@tekyonetim.com": "mehmet.kaya@tekyonetim.com",
  personel: "mehmet.kaya@tekyonetim.com",
};

const buildSessionForUser = (user, db = null) => {
  const store = db?.stores?.find((s) => sameId(s._id, user.tenantId)) || db?.stores?.[0];
  const storeAdmin =
    db?.users?.find(
      (u) => !u.isDeleted && sameId(u.tenantId, user.tenantId) && u.role === "admin",
    ) || user;
  return {
    token: `local.${user._id}.${Date.now().toString(36)}`,
    userId: user._id,
    ad: user.ad,
    soyad: user.soyad,
    tenantId: user.tenantId,
    storeName: store?.ad || "Tek Yönetim Mağazası",
    storeOwner: store?.yetkili || fullName(storeAdmin) || fullName(user),
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    pageLocks: user.pageLocks,
    hasPagePasswords: pagePasswordFlags(user),
  };
};

const seedDemoDataForStore = (db, store, ownerUser) => {
  const sample = buildSeedDatabase();
  const mapId = (oldId) => `${store._id}_${oldId}`;
  const ownerFullName = fullName(ownerUser);

  sample.products.forEach((p) => {
    const mapped = {
      ...p,
      _id: mapId(p._id),
      id: mapId(p.id),
      tenantId: store._id,
      createdBy: ownerUser._id,
    };
    db.products.push(mapped);
  });

  sample.stocks.forEach((s) => {
    const mapped = {
      ...s,
      _id: mapId(s._id),
      id: mapId(s.id),
      tenantId: store._id,
      createdBy: ownerUser._id,
    };
    db.stocks.push(mapped);
  });

  sample.stockHistory.forEach((m) => {
    const mapped = {
      ...m,
      _id: mapId(m._id),
      id: mapId(m.id),
      tenantId: store._id,
      performedBy: ownerUser._id,
      productId: mapId(m.productId),
    };
    db.stockHistory.push(mapped);
  });

  sample.customers.forEach((c) => {
    const mapped = {
      ...c,
      _id: mapId(c._id),
      id: mapId(c.id),
      tenantId: store._id,
      createdBy: ownerUser._id,
    };
    db.customers.push(mapped);
  });

  sample.transactions.forEach((t) => {
    const mapped = {
      ...t,
      _id: mapId(t._id),
      id: mapId(t.id),
      tenantId: store._id,
      createdBy: ownerUser._id,
      personelAdi: ownerFullName,
      musteriId: mapId(t.musteriId),
    };
    db.transactions.push(mapped);
  });

  sample.collections.forEach((col) => {
    const mapped = {
      ...col,
      _id: mapId(col._id),
      tenantId: store._id,
      customerId: mapId(col.customerId),
      transactionId: col.transactionId ? mapId(col.transactionId) : null,
      collectedBy: ownerUser._id,
      collectedByName: ownerFullName,
    };
    db.collections.push(mapped);
  });

  sample.branches.forEach((b) => {
    const isMerkez = b._id === "brn_merkez";
    const mapped = {
      ...b,
      _id: mapId(b._id),
      id: mapId(b.id),
      tenantId: store._id,
      adres: isMerkez && store.adres ? store.adres : b.adres,
      telefon: isMerkez && store.telefon ? store.telefon : b.telefon,
      sorumluPersonel: ownerUser._id,
      createdBy: ownerUser._id,
    };
    db.branches.push(mapped);
  });

  sample.transfers.forEach((tr) => {
    const mapped = {
      ...tr,
      _id: mapId(tr._id),
      id: mapId(tr.id),
      tenantId: store._id,
      fromBranch: mapId(tr.fromBranch),
      toBranch: mapId(tr.toBranch),
      createdBy: ownerUser._id,
      approvedBy: tr.approvedBy ? ownerUser._id : null,
    };
    db.transfers.push(mapped);
  });

  sample.shipments.forEach((sh) => {
    const mapped = {
      ...sh,
      _id: mapId(sh._id),
      id: mapId(sh.id),
      tenantId: store._id,
      customerId: mapId(sh.customerId),
      assignedPersonnel: [ownerUser._id],
      createdBy: ownerUser._id,
    };
    db.shipments.push(mapped);
  });

  sample.actionLogs.forEach((l) => {
    const mapped = {
      ...l,
      _id: mapId(l._id),
      tenantId: store._id,
      userId: ownerUser._id,
      userName: ownerFullName,
      entityId: l.entityId ? mapId(l.entityId) : l.entityId,
    };
    db.actionLogs.push(mapped);
  });
};

const auth = {
  login: ({ email, password }) =>
    run((db) => {
      const rawIdentifier = lc(email);
      const identifier = LOGIN_ALIASES[rawIdentifier] || rawIdentifier;
      if (!identifier || !password) {
        throw createHttpError("E-posta ve şifre zorunludur", 400);
      }

      const user = db.users.find(
        (u) =>
          !u.isDeleted &&
          (lc(u.email) === identifier || lc(u.email).split("@")[0] === identifier),
      );

      if (!user || user.password !== password) {
        throw createHttpError("E-posta veya şifre hatalı", 401);
      }

      const store = db.stores.find((s) => sameId(s._id, user.tenantId));
      if (!store || !store.isActive) {
        throw createHttpError("İşletme hesabı aktif değil", 403);
      }

      return buildSessionForUser(user, db);
    }),

  checkEmail: ({ email, storeName = "", exceptUserId = null }) =>
    run((db) => {
      const normalized = lc(email);
      if (!normalized || !normalized.includes("@")) {
        return { available: true, suggestions: [] };
      }
      const taken = isEmailTaken(db, normalized, exceptUserId);
      if (!taken) {
        return { available: true, suggestions: [] };
      }
      const suggestions = generateEmailSuggestions(normalized, storeName, db);
      return {
        available: false,
        message: "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
        suggestions,
      };
    }),

  registerStore: (payload = {}) =>
    run(
      (db) => {
        const storeName = str(payload.storeName || payload.magazaAdi);
        const ownerName = str(payload.ownerName || payload.yetkiliAdSoyad);
        const email = lc(payload.email);
        const phone = str(payload.phone || payload.telefon);
        const address = str(payload.address || payload.adres);
        const password = payload.password;
        const withDemoData =
          payload.withDemoData !== undefined ? Boolean(payload.withDemoData) : true;

        if (!storeName || !ownerName || !email || !password) {
          throw createHttpError(
            "Mağaza adı, yetkili ad soyad, e-posta ve şifre zorunludur.",
            400,
          );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw createHttpError("Geçerli bir e-posta adresi giriniz.", 400);
        }

        if (String(password).length < 5) {
          throw createHttpError("Şifre en az 5 karakter olmalıdır.", 400);
        }

        // E-posta tekillik kontrolü (Mağaza adında tekillik kısıtlaması YOKTUR)
        if (isEmailTaken(db, email)) {
          const suggestions = generateEmailSuggestions(email, storeName, db);
          throw createHttpError(
            "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
            409,
            { suggestions },
          );
        }

        const nameParts = ownerName.split(/\s+/).filter(Boolean);
        const ad =
          nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0] || "Mağaza";
        const soyad = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "Yetkilisi";
        const now = nowIso();
        const storeId = newId("store");

        const store = {
          _id: storeId,
          id: storeId,
          ad: storeName,
          unvan: storeName,
          yetkili: `${ad} ${soyad}`.trim(),
          adres: address,
          telefon: phone,
          email,
          vergiDairesi: "",
          vergiNo: "",
          isActive: true,
          withDemoData,
          createdAt: now,
          updatedAt: now,
        };
        db.stores.push(store);

        const allPermissions = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]));
        const noLocks = Object.fromEntries(PAGE_LOCK_KEYS.map((k) => [k, false]));

        const ownerUser = {
          _id: newId("usr"),
          id: "",
          tenantId: storeId,
          ad,
          soyad,
          email,
          password: String(password),
          role: "admin",
          permissions: allPermissions,
          pageLocks: noLocks,
          pagePasswords: { finans: "", stok: "", raporlar: "", envanter: "", transferler: "" },
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };
        ownerUser.id = ownerUser._id;
        db.users.push(ownerUser);

        if (withDemoData) {
          seedDemoDataForStore(db, store, ownerUser);
        } else {
          const defaultBranchId = newId("brn");
          db.branches.push({
            _id: defaultBranchId,
            id: defaultBranchId,
            tenantId: storeId,
            ad: "Merkez Mağaza",
            adres: address,
            telefon: phone,
            sorumluPersonel: ownerUser._id,
            isActive: true,
            createdBy: ownerUser._id,
            createdAt: now,
            updatedAt: now,
          });
          logAction(
            db,
            ownerUser,
            "MAGAZA_OLUSTUR",
            "Store",
            store._id,
            { magazaAdi: storeName, yetkili: store.yetkili },
            now,
          );
        }

        return buildSessionForUser(ownerUser, db);
      },
      { write: true },
    ),

  verifyPagePassword: ({ page, password }) =>
    run((db) => {
      if (!page || !password) {
        throw createHttpError("Sayfa adı ve şifre zorunludur", 400);
      }
      const actor = getActor(db);
      const stored = actor.pagePasswords?.[page];
      if (!stored) return { authorized: true, noPassword: true };
      if (stored !== password) throw createHttpError("Şifre hatalı", 401);
      return { authorized: true };
    }),

  setPagePassword: (userId, { page, password }) =>
    run(
      (db) => {
        if (!page || !PAGE_PASSWORD_KEYS.includes(page)) {
          throw createHttpError("Geçersiz sayfa adı", 400);
        }
        const user = db.users.find((u) => !u.isDeleted && sameId(u._id, userId));
        if (!user) throw createHttpError("Kullanıcı bulunamadı", 404);
        user.pagePasswords = { ...user.pagePasswords, [page]: password || "" };
        touch(user);
        return { message: "Sayfa şifresi güncellendi" };
      },
      { write: true },
    ),
};

// ─── Mağaza ───────────────────────────────────────────────────────────────────

const stores = {
  getProfile: () =>
    run((db) => {
      const tenantId = getCurrentTenantId(db);
      return db.stores.find((s) => sameId(s._id, tenantId)) ?? db.stores[0];
    }),
};

// ─── Personeller ──────────────────────────────────────────────────────────────

const users = {
  list: () =>
    run((db) => active(db.users).sort(byDateDesc("createdAt")).map(sanitizeUser)),

  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const ad = str(payload.ad);
        const soyad = str(payload.soyad);
        const email = lc(payload.email);
        const password = payload.password;

        if (!ad || !soyad || !email || !password) {
          throw createHttpError("Ad, soyad, e-posta ve şifre zorunludur", 400);
        }
        if (String(password).length < 5) {
          throw createHttpError("Şifre en az 5 karakter olmalıdır", 400);
        }

        const role = payload.role || "personel";
        if (!ROLE_HIERARCHY[role]) throw createHttpError("Geçersiz rol", 400);
        if (!canManageRole(actor.role, role)) {
          throw createHttpError("Kendinizden üst bir rol atayamazsınız", 403);
        }
        if (isEmailTaken(db, email)) {
          const suggestions = generateEmailSuggestions(email, soyad, db);
          throw createHttpError(
            "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
            409,
            { suggestions },
          );
        }

        const user = newEntity("usr", {
          tenantId: actor.tenantId,
          createdBy: actor._id,
          ad,
          soyad,
          email,
          password,
          role,
          permissions: normalizeFlags(payload.permissions, PERMISSION_KEYS),
          pageLocks: normalizeFlags(payload.pageLocks, PAGE_LOCK_KEYS),
          pagePasswords: { finans: "", stok: "", raporlar: "", envanter: "", transferler: "" },
        });
        db.users.push(user);
        logAction(db, actor, "KULLANICI_EKLE", "User", user._id, { ad, soyad, role });
        return sanitizeUser(user);
      },
      { write: true },
    ),

  update: (userId, payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        if (sameId(userId, actor._id)) {
          throw createHttpError("Kendi hesabınızı bu panel üzerinden düzenleyemezsiniz", 400);
        }
        const user = db.users.find((u) => !u.isDeleted && inTenant(u) && sameId(u._id, userId));
        if (!user) throw createHttpError("Personel bulunamadı", 404);

        const ad = str(payload.ad);
        const soyad = str(payload.soyad);
        const email = lc(payload.email);
        if (!ad || !soyad || !email) {
          throw createHttpError("Ad, soyad ve e-posta zorunludur", 400);
        }
        if (isEmailTaken(db, email, user._id)) {
          const suggestions = generateEmailSuggestions(email, soyad, db);
          throw createHttpError(
            "Bu e-posta adresi başka bir mağaza/kullanıcı tarafından kullanılmaktadır.",
            409,
            { suggestions },
          );
        }

        const role = payload.role || user.role;
        if (role !== user.role && !canManageRole(actor.role, role)) {
          throw createHttpError("Bu role atama yapma yetkiniz yok", 403);
        }

        Object.assign(user, {
          ad,
          soyad,
          email,
          role,
          permissions: normalizeFlags(payload.permissions, PERMISSION_KEYS),
          pageLocks: normalizeFlags(payload.pageLocks, PAGE_LOCK_KEYS),
        });
        touch(user);
        return sanitizeUser(user);
      },
      { write: true },
    ),

  remove: (userId) =>
    run(
      (db) => {
        const actor = getActor(db);
        const user = db.users.find((u) => !u.isDeleted && inTenant(u) && sameId(u._id, userId));
        if (!user) throw createHttpError("Personel bulunamadı", 404);
        if (sameId(user._id, actor._id)) {
          throw createHttpError("Giriş yapan yönetici kendi hesabını silemez", 400);
        }
        if (user.role === "admin" && active(db.users).filter((u) => u.role === "admin").length <= 1) {
          throw createHttpError("Sistemde en az bir admin hesabı bulunmalıdır", 400);
        }
        user.isDeleted = true;
        user.deletedBy = actor._id;
        touch(user);
        logAction(db, actor, "KULLANICI_SIL", "User", user._id, { ad: user.ad, soyad: user.soyad });
        return { message: "Personel silindi" };
      },
      { write: true },
    ),

  changePassword: (userId, newPassword) =>
    run(
      (db) => {
        const actor = getActor(db);
        if (!newPassword || String(newPassword).length < 5) {
          throw createHttpError("Yeni şifre en az 5 karakter olmalıdır", 400);
        }
        if (sameId(userId, actor._id)) {
          throw createHttpError("Kendi şifrenizi bu panel üzerinden değiştiremezsiniz", 400);
        }
        const user = db.users.find((u) => !u.isDeleted && inTenant(u) && sameId(u._id, userId));
        if (!user) throw createHttpError("Personel bulunamadı", 404);
        user.password = String(newPassword);
        touch(user);
        return { message: "Şifre başarıyla güncellendi" };
      },
      { write: true },
    ),
};

// ─── Satış / Tahsilat çekirdeği ───────────────────────────────────────────────

const normalizeTransactionType = (raw) => {
  const text = lc(raw)
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g");
  return ["tahsilat", "borc_odeme", "borc odeme", "odeme"].includes(text) ? "Tahsilat" : "Satış";
};

const normalizeProductLine = (item = {}) => {
  const adet = Math.max(0, num(item.adet));
  const fallbackPending = item.envanterdeMi ? adet : 0;
  const rawPending =
    item.envanterdeBekleyenAdet !== undefined ? num(item.envanterdeBekleyenAdet) : fallbackPending;
  const pending = Math.min(adet, Math.max(0, rawPending));

  return {
    urunKodu: str(item.urunKodu),
    adet,
    envanterdeBekleyenAdet: pending,
    envanterdeMi: pending > 0,
    envanterAciklamasi: pending > 0 ? str(item.envanterAciklamasi) : "",
  };
};

const recordCollection = (db, { customer, transaction, amount, actor, method, date, notes, kaynak }) => {
  const collection = newEntity("col", {
    customerId: customer._id,
    transactionId: transaction?._id ?? null,
    installmentId: null,
    amount,
    collectedBy: actor._id,
    collectedByName: fullName(actor),
    paymentMethod: toCollectionMethod(method),
    collectionDate: date,
    notes: notes || "",
    kaynak,
    createdAt: date,
    updatedAt: date,
  });
  db.collections.push(collection);
  return collection;
};

/** Backend `createTransactionForCustomer` davranışının birebir lokal karşılığı. */
const createTransactionForCustomer = (db, customer, payload, actor) => {
  if (!customer) throw createHttpError("Customer not found", 404);

  const type = normalizeTransactionType(payload.islemTuru || payload.type || "Satış");
  const isTahsilat = type === "Tahsilat";
  const total = num(payload.toplamTutar);
  const pesinat = Math.min(num(payload.pesinat), Math.max(0, total));
  const collectionAmount = num(
    payload.odenenTutar ??
      payload.tutar ??
      payload.tahsilatTutari ??
      payload.toplamTutar ??
      payload.pesinat ??
      0,
  );

  if (isTahsilat && collectionAmount <= 0) {
    throw createHttpError("Tahsilat tutarı sıfırdan büyük olmalı", 400);
  }
  if (!isTahsilat && total <= 0) {
    throw createHttpError("Satış tutarı sıfırdan büyük olmalı", 400);
  }

  const lines = isTahsilat
    ? []
    : (Array.isArray(payload.urunler) ? payload.urunler : []).map(normalizeProductLine);
  if (!isTahsilat && lines.length === 0) {
    throw createHttpError("En az bir ürün gerekli", 400);
  }

  // Stok kontrolü ve düşümü (aynı ürün kodu birden fazla satırda olabilir)
  const touchedStocks = new Map();
  if (!isTahsilat) {
    for (const line of lines) {
      if (!line.urunKodu) throw createHttpError("Ürün kodu gerekli", 400);
      if (line.adet <= 0) {
        throw createHttpError(`${line.urunKodu} için adet 1 veya daha büyük olmalı`, 400);
      }

      const stock = touchedStocks.get(line.urunKodu) ?? stockByCode(db, line.urunKodu);
      if (!stock) {
        throw createHttpError(`${line.urunKodu} için stok kaydı bulunamadı`, 404);
      }

      const physical = num(stock.adet);
      const held = num(stock.envanterdekiAdet);
      if (line.adet > Math.max(0, physical - held)) {
        throw createHttpError(`${line.urunKodu} için yeterli kullanılabilir stok yok`, 400);
      }

      stock.adet = physical - Math.max(0, line.adet - line.envanterdeBekleyenAdet);
      stock.envanterdekiAdet = held + line.envanterdeBekleyenAdet;
      touchedStocks.set(line.urunKodu, stock);
    }
  }

  const remaining = isTahsilat ? 0 : round2(Math.max(0, total - pesinat));
  const nextBalance = isTahsilat
    ? Math.max(0, num(customer.toplamKalanBakiye) - collectionAmount)
    : num(customer.toplamKalanBakiye) + remaining;

  touchedStocks.forEach((stock) => {
    touch(stock);
    syncProductFromStock(db, stock);
  });

  const at = normalizeDate(payload.tarih);
  const odemeYontemi = payload.odemeYontemi || (isTahsilat ? "Nakit" : "Veresiye");
  const enrichedLines = lines.map((line) => {
    const product = productByCode(db, line.urunKodu);
    const stock = stockByCode(db, line.urunKodu);
    return {
      ...line,
      urunAdi: product?.ad || stock?.urunAdi || line.urunKodu,
      marka: product?.marka || stock?.marka || "",
      birimFiyat: product?.satisFiyati ?? 0,
    };
  });

  setBalance(customer, nextBalance);
  customer.sonIslemTarihi = at;

  const transaction = newEntity("tx", {
    createdBy: actor._id,
    personelAdi: fullName(actor),
    musteriId: customer._id,
    musteriAdSoyad: fullName(customer),
    musteriNo: customer.musteriNo,
    tarih: at,
    islemTuru: type,
    islemTipi: isTahsilat ? "TAHSILAT" : "SATIS",
    urunler: enrichedLines,
    urunBilgisi: enrichedLines.length
      ? enrichedLines.map((l) => `${l.urunKodu} (x${l.adet})`).join(", ")
      : "İşlem",
    toplamTutar: isTahsilat ? collectionAmount : total,
    pesinat: isTahsilat ? collectionAmount : pesinat,
    ...(isTahsilat ? { tutar: collectionAmount, odenenTutar: collectionAmount } : {}),
    kalanHesap: isTahsilat ? customer.toplamKalanBakiye : remaining,
    alinanTutar: isTahsilat ? collectionAmount : pesinat,
    kalanBorc: isTahsilat ? customer.toplamKalanBakiye : remaining,
    musteriBakiyeSonrasi: customer.toplamKalanBakiye,
    odemeYontemi,
    kayitDefteri: str(payload.kayitDefteri),
    aciklama: str(payload.aciklama),
    installments: [],
    createdAt: at,
    updatedAt: at,
  });
  db.transactions.push(transaction);

  const collected = isTahsilat ? collectionAmount : pesinat;
  if (collected > 0) {
    recordCollection(db, {
      customer,
      transaction,
      amount: collected,
      actor,
      method: odemeYontemi,
      date: at,
      notes: isTahsilat ? str(payload.aciklama) || "Tahsilat" : "Satış peşinatı",
      kaynak: isTahsilat ? "TAHSILAT" : "SATIS_PESINAT",
    });
  }

  logAction(
    db,
    actor,
    isTahsilat ? "TAHSILAT_AL" : "SATIS_OLUSTUR",
    "Transaction",
    transaction._id,
    isTahsilat
      ? {
          musteri: fullName(customer),
          musteriNo: customer.musteriNo,
          tutar: collectionAmount,
          odemeYontemi,
          kalanBorc: customer.toplamKalanBakiye,
        }
      : {
          musteri: fullName(customer),
          musteriNo: customer.musteriNo,
          urunler: transaction.urunBilgisi,
          toplamTutar: total,
          pesinat,
          kalanBorc: remaining,
        },
    at,
  );

  return transaction;
};

// ─── Müşteriler ───────────────────────────────────────────────────────────────

const customers = {
  list: () => run((db) => active(db.customers).sort(byDateDesc("createdAt"))),

  getById: (id) =>
    run((db) => {
      const customer = findCustomer(db, id);
      if (!customer) throw createHttpError("Customer not found", 404);
      return customer;
    }),

  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const ad = str(payload.ad);
        const soyad = str(payload.soyad);
        const telefon = str(payload.telefon);
        const tcKimlik = str(payload.tcKimlik);

        if (!ad || !soyad || !telefon) {
          throw createHttpError("Ad, soyad and telefon are required", 400);
        }
        if (tcKimlik && active(db.customers).some((c) => c.tcKimlik === tcKimlik)) {
          throw createHttpError("Bu TC ile zaten kayıt var", 400);
        }

        const tenantCustomers = db.customers.filter((c) => inTenant(c));
        const lastNo = tenantCustomers.reduce((max, c) => Math.max(max, num(c.musteriNo)), 1000);
        const registeredAt = normalizeDate(payload.satis?.tarih);
        const customer = newEntity("cus", {
          createdBy: actor._id,
          musteriNo: lastNo + 1,
          ad,
          soyad,
          tcKimlik,
          tc: tcKimlik,
          telefon,
          adres: str(payload.adres),
          toplamKalanBakiye: Math.max(0, num(payload.toplamKalanBakiye)),
          kalanBorc: Math.max(0, num(payload.toplamKalanBakiye)),
          installments: [],
          kayitTarihi: registeredAt,
          sonIslemTarihi: registeredAt,
        });
        db.customers.push(customer);
        logAction(db, actor, "MUSTERI_EKLE", "Customer", customer._id, {
          ad,
          soyad,
          musteriNo: customer.musteriNo,
        });

        const hasSale =
          payload.satis && typeof payload.satis === "object" && !Array.isArray(payload.satis);
        if (hasSale) {
          const transaction = createTransactionForCustomer(db, customer, payload.satis, actor);
          return { customer, transaction };
        }
        return customer;
      },
      { write: true },
    ),

  remove: (id) =>
    run(
      (db) => {
        const actor = getActor(db);
        const customer = findCustomer(db, id);
        if (!customer) throw createHttpError("Customer not found", 404);

        db.transactions
          .filter((t) => !t.isDeleted && sameId(t.musteriId, customer._id))
          .forEach((transaction) => {
            // Envanterde bekleyen ürünlerin rezervesini serbest bırak
            (transaction.urunler || []).forEach((line) => {
              const pending = num(line.envanterdeBekleyenAdet);
              const stock = stockByCode(db, line.urunKodu);
              if (pending > 0 && stock) {
                stock.envanterdekiAdet = Math.max(0, num(stock.envanterdekiAdet) - pending);
                touch(stock);
              }
            });
            transaction.isDeleted = true;
            transaction.deletedBy = actor._id;
            touch(transaction);
          });

        db.collections
          .filter((c) => !c.isDeleted && sameId(c.customerId, customer._id))
          .forEach((collection) => {
            collection.isDeleted = true;
            touch(collection);
          });

        customer.isDeleted = true;
        customer.deletedBy = actor._id;
        touch(customer);
        logAction(db, actor, "MUSTERI_SIL", "Customer", customer._id, {
          ad: customer.ad,
          soyad: customer.soyad,
        });
        return { message: "Customer and related records deleted" };
      },
      { write: true },
    ),
};

// ─── İşlemler ─────────────────────────────────────────────────────────────────

const withCustomerRef = (db, transaction) => ({
  ...transaction,
  musteriId: customerRef(db.customers.find((c) => sameId(c._id, transaction.musteriId))) ??
    transaction.musteriId,
});

const transactions = {
  list: () =>
    run((db) =>
      active(db.transactions)
        .sort(byDateDesc("tarih"))
        .map((t) => withCustomerRef(db, t)),
    ),

  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        if (!payload.musteriId) throw createHttpError("Müşteri ID gerekli", 400);
        const customer = findCustomer(db, payload.musteriId);
        if (!customer) throw createHttpError("Customer not found", 404);
        return createTransactionForCustomer(db, customer, payload, actor);
      },
      { write: true },
    ),

  listByCustomer: (customerId) =>
    run((db) => {
      const customer = findCustomer(db, customerId);
      if (!customer) throw createHttpError("Customer not found", 404);
      return active(db.transactions)
        .filter((t) => sameId(t.musteriId, customer._id))
        .sort(byDateDesc("tarih"))
        .map((t) => withCustomerRef(db, t));
    }),
};

// ─── Stoklar ──────────────────────────────────────────────────────────────────

const stocks = {
  list: () => run((db) => db.stocks.filter((s) => inTenant(s)).sort(byDateDesc("createdAt"))),

  addOrUpdate: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const code = str(payload.urunKodu);
        if (!code || payload.adet === undefined) {
          throw createHttpError("urunKodu and adet are required", 400);
        }

        const adet = num(payload.adet);
        const serials = Array.isArray(payload.serialNumbers)
          ? payload.serialNumbers.map(str).filter(Boolean)
          : [];

        let stock = stockByCode(db, code);
        if (stock) {
          stock.adet = num(stock.adet) + adet;
          if (payload.marka) stock.marka = payload.marka;
          if (serials.length) {
            stock.serialNumbers = [...new Set([...(stock.serialNumbers || []), ...serials])];
          }
          touch(stock);
        } else {
          stock = newEntity("stk", {
            createdBy: actor._id,
            urunKodu: code,
            urunAdi: code,
            marka: payload.marka || "Profilo",
            adet,
            envanterdekiAdet: 0,
            serialNumbers: serials,
          });
          db.stocks.push(stock);
        }

        const product = productByCode(db, code);
        if (product) {
          stock.urunAdi = product.ad;
          stock.kategori = product.kategori;
          syncProductFromStock(db, stock);
          if (adet > 0) {
            db.stockHistory.push(
              newEntity("mov", {
                performedBy: actor._id,
                productId: product._id,
                urunKodu: code,
                hareketTipi: "Giriş",
                miktar: adet,
                oncekiStok: stock.adet - adet,
                sonrakiStok: stock.adet,
                aciklama: "Stok sayfasından ekleme",
                cancelledBy: null,
                cancelledAt: null,
              }),
            );
          }
        }

        logAction(db, actor, "STOK_EKLE", "Stock", stock._id, { urunKodu: code, adet });
        return stock;
      },
      { write: true },
    ),

  updateQuantity: (stockId, payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        if (payload?.adet === undefined) throw createHttpError("adet is required", 400);

        const adet = Number(payload.adet);
        if (!Number.isFinite(adet) || adet < 0) {
          throw createHttpError("adet must be a valid number greater than or equal to 0", 400);
        }

        const stock = db.stocks.find((s) => sameId(s._id, stockId));
        if (!stock) throw createHttpError("Stock not found", 404);

        const minimum = num(stock.envanterdekiAdet);
        if (adet < minimum) {
          throw createHttpError(
            `Toplam stok, envanterdeki adet (${minimum}) altına düşürülemez`,
            400,
          );
        }

        const previous = stock.adet;
        stock.adet = adet;
        touch(stock);
        syncProductFromStock(db, stock);
        logAction(db, actor, "STOK_GUNCELLE", "Stock", stock._id, {
          urunKodu: stock.urunKodu,
          onceki: previous,
          yeni: adet,
        });
        return stock;
      },
      { write: true },
    ),
};

// ─── Ürünler ve stok hareketleri ──────────────────────────────────────────────

const findProduct = (db, id) =>
  db.products.find((p) => !p.isDeleted && inTenant(p) && sameId(p._id, id));

const assertUniqueBarcode = (db, barkod, exceptId) => {
  if (!barkod) return;
  const duplicate = db.products.some(
    (p) => !p.isDeleted && inTenant(p) && p.barkod === barkod && !sameId(p._id, exceptId),
  );
  if (duplicate) throw createHttpError("Bu barkod zaten kayıtlı", 409);
};

const products = {
  list: () => run((db) => active(db.products).sort(byDateDesc("createdAt"))),

  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const ad = str(payload.ad);
        if (!ad) throw createHttpError("Ürün adı zorunludur", 400);

        const barkod = str(payload.barkod);
        assertUniqueBarcode(db, barkod);

        const product = newEntity("prd", {
          createdBy: actor._id,
          urunKodu: str(payload.urunKodu),
          marka: str(payload.marka),
          ad,
          kategori: str(payload.kategori),
          barkod,
          seriNo: str(payload.seriNo),
          alisFiyati: Math.max(0, num(payload.alisFiyati)),
          satisFiyati: Math.max(0, num(payload.satisFiyati)),
          mevcutStok: Math.max(0, num(payload.mevcutStok)),
          kritikStokSeviyesi: Math.max(0, num(payload.kritikStokSeviyesi, 5)),
          garantiSuresi: Math.max(0, num(payload.garantiSuresi)),
          tedarikci: str(payload.tedarikci),
        });
        db.products.push(product);

        // Ürün kodu verildiyse satış tarafının kullandığı stok kaydıyla bağla
        if (product.urunKodu && !stockByCode(db, product.urunKodu)) {
          db.stocks.push(
            newEntity("stk", {
              createdBy: actor._id,
              urunKodu: product.urunKodu,
              urunAdi: product.ad,
              marka: product.marka || "Profilo",
              kategori: product.kategori,
              alisFiyati: product.alisFiyati,
              satisFiyati: product.satisFiyati,
              adet: product.mevcutStok,
              envanterdekiAdet: 0,
              serialNumbers: [],
            }),
          );
        }

        logAction(db, actor, "URUN_EKLE", "Product", product._id, { ad: product.ad });
        return product;
      },
      { write: true },
    ),

  update: (id, payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const product = findProduct(db, id);
        if (!product) throw createHttpError("Ürün bulunamadı", 404);

        if (payload.barkod !== undefined) assertUniqueBarcode(db, str(payload.barkod), product._id);

        const allowed = [
          "ad",
          "kategori",
          "barkod",
          "seriNo",
          "alisFiyati",
          "satisFiyati",
          "kritikStokSeviyesi",
          "garantiSuresi",
          "tedarikci",
        ];
        allowed.forEach((field) => {
          if (payload[field] !== undefined) {
            product[field] = typeof payload[field] === "string" ? str(payload[field]) : num(payload[field]);
          }
        });
        touch(product);
        logAction(db, actor, "URUN_GUNCELLE", "Product", product._id, { ad: product.ad });
        return product;
      },
      { write: true },
    ),

  remove: (id) =>
    run(
      (db) => {
        const actor = getActor(db);
        const product = findProduct(db, id);
        if (!product) throw createHttpError("Ürün bulunamadı", 404);
        product.isDeleted = true;
        touch(product);
        logAction(db, actor, "URUN_SIL", "Product", product._id, { ad: product.ad });
        return { message: "Ürün silindi" };
      },
      { write: true },
    ),

  listMovements: (productId = null) =>
    run((db) =>
      active(db.stockHistory)
        .filter((m) => !productId || sameId(m.productId, productId))
        .sort(byDateDesc("createdAt"))
        .slice(0, 200)
        .map((movement) => {
          const product = db.products.find((p) => sameId(p._id, movement.productId));
          return {
            ...movement,
            performedBy: userRef(db, movement.performedBy),
            productId: product
              ? { _id: product._id, id: product._id, ad: product.ad, barkod: product.barkod }
              : movement.productId,
          };
        }),
    ),

  addMovement: ({ productId, hareketTipi, miktar, aciklama }) =>
    run(
      (db) => {
        const actor = getActor(db);
        if (!productId || !hareketTipi || !miktar) {
          throw createHttpError("productId, hareketTipi ve miktar zorunludur", 400);
        }
        if (!["Giriş", "Çıkış", "Transfer"].includes(hareketTipi)) {
          throw createHttpError("Geçersiz hareketTipi", 400);
        }

        const quantity = Number(miktar);
        if (!Number.isFinite(quantity) || quantity < 1) {
          throw createHttpError("miktar en az 1 olmalıdır", 400);
        }

        const product = findProduct(db, productId);
        if (!product) throw createHttpError("Ürün bulunamadı", 404);

        const previous = num(product.mevcutStok);
        if (hareketTipi !== "Giriş" && previous < quantity) {
          throw createHttpError(
            `Yetersiz stok. Mevcut: ${previous}, istenen çıkış: ${quantity}`,
            400,
          );
        }
        const next = hareketTipi === "Giriş" ? previous + quantity : previous - quantity;

        const history = newEntity("mov", {
          performedBy: actor._id,
          productId: product._id,
          urunKodu: product.urunKodu || "",
          hareketTipi,
          miktar: quantity,
          oncekiStok: previous,
          sonrakiStok: next,
          aciklama: str(aciklama),
          cancelledBy: null,
          cancelledAt: null,
        });
        db.stockHistory.push(history);

        product.mevcutStok = next;
        touch(product);
        syncStockFromProduct(db, product);
        logAction(db, actor, "STOK_HAREKET", "StockHistory", history._id, {
          urun: product.ad,
          hareketTipi,
          miktar: quantity,
        });
        return { history, product };
      },
      { write: true },
    ),

  cancelMovement: (movementId) =>
    run(
      (db) => {
        const actor = getActor(db);
        const history = db.stockHistory.find((m) => !m.isDeleted && sameId(m._id, movementId));
        if (!history) {
          throw createHttpError("Stok hareketi bulunamadı veya zaten iptal edilmiş", 404);
        }

        const product = findProduct(db, history.productId);
        if (!product) throw createHttpError("İlgili ürün bulunamadı", 404);

        if (history.hareketTipi === "Giriş") {
          if (product.mevcutStok < history.miktar) {
            throw createHttpError(
              "Bu girişi geri almak için yeterli stok yok (stok sonradan tüketilmiş olabilir)",
              400,
            );
          }
          product.mevcutStok -= history.miktar;
        } else {
          product.mevcutStok += history.miktar;
        }

        history.isDeleted = true;
        history.cancelledBy = actor._id;
        history.cancelledAt = nowIso();
        touch(history);
        touch(product);
        syncStockFromProduct(db, product);
        logAction(db, actor, "STOK_HAREKET_IPTAL", "StockHistory", history._id, {
          urun: product.ad,
          hareketTipi: history.hareketTipi,
          miktar: history.miktar,
        });
        return { message: "Stok hareketi başarıyla iptal edildi", history, product };
      },
      { write: true },
    ),
};

// ─── Envanter (bekleyen teslimatlar) ──────────────────────────────────────────

const pendingQuantity = (line) =>
  num(
    line.envanterdeBekleyenAdet !== undefined
      ? line.envanterdeBekleyenAdet
      : line.envanterdeMi
        ? line.adet
        : 0,
  );

const inventory = {
  listPending: () =>
    run((db) =>
      active(db.transactions)
        .filter((t) => (t.urunler || []).some((line) => pendingQuantity(line) > 0))
        .sort(byDateDesc("tarih"))
        .map((transaction) => ({
          ...withCustomerRef(db, transaction),
          urunler: transaction.urunler.map((line) => {
            const pending = pendingQuantity(line);
            return {
              ...line,
              adet: line.envanterdeMi ? pending : num(line.adet),
              envanterdeBekleyenAdet: pending,
              envanterdeMi: pending > 0,
            };
          }),
        })),
    ),

  deliver: ({ transactionId, urunKodu, teslimEdilecekAdet }) =>
    run(
      (db) => {
        const actor = getActor(db);
        if (!transactionId || !urunKodu || teslimEdilecekAdet === undefined) {
          throw createHttpError("transactionId, urunKodu and teslimEdilecekAdet are required", 400);
        }

        const transaction = db.transactions.find(
          (t) => !t.isDeleted && sameId(t._id, transactionId),
        );
        if (!transaction) throw createHttpError("Transaction not found", 404);

        const line = (transaction.urunler || []).find((item) => item.urunKodu === urunKodu);
        if (!line) throw createHttpError("Inventory item not found", 404);

        const pending = pendingQuantity(line);
        const delivered = Number(teslimEdilecekAdet);
        if (!(delivered > 0) || delivered > pending) {
          throw createHttpError("Teslim edilecek adet geçersiz", 400);
        }

        const stock = stockByCode(db, urunKodu);
        if (!stock) throw createHttpError("Stock not found", 404);
        if (delivered > num(stock.adet) || delivered > num(stock.envanterdekiAdet)) {
          throw createHttpError("Stokta teslim edilecek kadar envanter ürünü yok", 400);
        }

        stock.adet = num(stock.adet) - delivered;
        stock.envanterdekiAdet = num(stock.envanterdekiAdet) - delivered;
        touch(stock);
        syncProductFromStock(db, stock);

        line.envanterdeBekleyenAdet = pending - delivered;
        line.envanterdeMi = line.envanterdeBekleyenAdet > 0;
        if (!line.envanterdeMi) line.envanterAciklamasi = "";
        touch(transaction);

        logAction(db, actor, "STOK_HAREKET", "Transaction", transaction._id, {
          islem: "ENVANTER_TESLIM",
          urunKodu,
          teslimEdilenAdet: delivered,
          musteri: transaction.musteriAdSoyad,
        });
        return transaction;
      },
      { write: true },
    ),
};

// ─── Kasa / Tahsilatlar ───────────────────────────────────────────────────────

const withCollectionRefs = (db, collection) => ({
  ...collection,
  customerId:
    customerRef(db.customers.find((c) => sameId(c._id, collection.customerId))) ??
    collection.customerId,
  collectedBy: userRef(db, collection.collectedBy) ?? collection.collectedBy,
  installmentId: collection.installmentId
    ? (db.installments.find((i) => sameId(i._id, collection.installmentId)) ?? collection.installmentId)
    : null,
});

const collections = {
  list: (params = {}) =>
    run((db) => {
      const { customerId, collectedBy, startDate, endDate } = params;
      return active(db.collections)
        .filter((c) => !customerId || sameId(c.customerId, customerId))
        .filter((c) => !collectedBy || sameId(c.collectedBy, collectedBy))
        .filter((c) => {
          const time = new Date(c.collectionDate).getTime();
          if (startDate && time < dayBounds(startDate)[0]) return false;
          if (endDate && time > dayBounds(endDate)[1]) return false;
          return true;
        })
        .sort(byDateDesc("collectionDate"))
        .map((c) => withCollectionRefs(db, c));
    }),

  getById: (id) =>
    run((db) => {
      const collection = active(db.collections).find((c) => sameId(c._id, id));
      if (!collection) throw createHttpError("Tahsilat bulunamadı", 404);
      return withCollectionRefs(db, collection);
    }),

  /** CustomerFinancePage "Tahsilat Al" — hem kasa kaydı hem Tahsilat işlemi oluşturur. */
  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const amount = num(payload.amount);
        if (!payload.customerId || !amount) {
          throw createHttpError("customerId ve amount zorunludur", 400);
        }
        if (amount <= 0) {
          throw createHttpError("Tahsilat tutarı 0'dan büyük olmalıdır", 400);
        }

        const customer = findCustomer(db, payload.customerId);
        if (!customer) throw createHttpError("Müşteri bulunamadı", 404);

        const installment = payload.installmentId
          ? db.installments.find((i) => !i.isDeleted && sameId(i._id, payload.installmentId))
          : null;
        if (installment && !installment.isPaid) {
          installment.paidAmount = num(installment.paidAmount) + amount;
          if (installment.paidAmount >= installment.amount) {
            installment.isPaid = true;
            installment.status = "Ödendi";
            installment.paidDate = normalizeDate(payload.collectionDate);
            installment.paidAmount = installment.amount;
          } else {
            installment.status = "Kısmi Ödendi";
          }
          touch(installment);
        }

        // Tahsilat işlemi (müşteri geçmişinde görünür, bakiyeyi düşürür, kasa kaydını açar)
        const transaction = createTransactionForCustomer(
          db,
          customer,
          {
            islemTuru: "Tahsilat",
            tarih: payload.collectionDate,
            odenenTutar: amount,
            odemeYontemi: payload.paymentMethod || "Nakit",
            aciklama: payload.notes,
            kayitDefteri: "Ana Defter",
          },
          actor,
        );

        const collection = db.collections.find((c) => sameId(c.transactionId, transaction._id));
        if (collection && installment) collection.installmentId = installment._id;
        return withCollectionRefs(db, collection);
      },
      { write: true },
    ),

  /** Tahsilat iptali: bakiye geri yüklenir, ilişkili işlem ve taksit geri alınır. */
  remove: (id) =>
    run(
      (db) => {
        const collection = active(db.collections).find((c) => sameId(c._id, id));
        if (!collection) throw createHttpError("Tahsilat bulunamadı", 404);

        const customer = findCustomer(db, collection.customerId);
        if (customer) setBalance(customer, num(customer.toplamKalanBakiye) + collection.amount);

        if (collection.installmentId) {
          const installment = db.installments.find((i) => sameId(i._id, collection.installmentId));
          if (installment) {
            installment.paidAmount = Math.max(0, num(installment.paidAmount) - collection.amount);
            installment.isPaid = false;
            installment.paidDate = null;
            installment.status = installment.paidAmount === 0 ? "Bekliyor" : "Kısmi Ödendi";
            touch(installment);
          }
        }

        if (collection.kaynak === "TAHSILAT" && collection.transactionId) {
          const transaction = db.transactions.find((t) => sameId(t._id, collection.transactionId));
          if (transaction) {
            transaction.isDeleted = true;
            touch(transaction);
          }
        }

        collection.isDeleted = true;
        touch(collection);
        return { message: "Tahsilat başarıyla iptal edildi" };
      },
      { write: true },
    ),
};

// ─── Taksitler (eski arayüzler çökmesin diye korunur; seed'de boştur) ────────

const withInstallmentRefs = (db, installment) => ({
  ...installment,
  customerId:
    customerRef(db.customers.find((c) => sameId(c._id, installment.customerId))) ??
    installment.customerId,
});

const startOfToday = () => todayBounds()[0];

const installments = {
  list: (params = {}) =>
    run((db) =>
      active(db.installments)
        .filter((i) => !params.customerId || sameId(i.customerId, params.customerId))
        .filter((i) => params.isPaid === undefined || i.isPaid === (String(params.isPaid) === "true"))
        .filter((i) => !params.groupId || sameId(i.groupId, params.groupId))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .map((i) => withInstallmentRefs(db, i)),
    ),

  listOverdue: () =>
    run((db) =>
      active(db.installments)
        .filter((i) => !i.isPaid && new Date(i.dueDate).getTime() < startOfToday())
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .map((i) => withInstallmentRefs(db, i)),
    ),

  getById: (id) =>
    run((db) => {
      const installment = active(db.installments).find((i) => sameId(i._id, id));
      if (!installment) throw createHttpError("Taksit bulunamadı", 404);
      return withInstallmentRefs(db, installment);
    }),

  customerSummary: (customerId) =>
    run((db) => {
      const customer = findCustomer(db, customerId);
      if (!customer) throw createHttpError("Müşteri bulunamadı", 404);

      const list = active(db.installments)
        .filter((i) => sameId(i.customerId, customer._id))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      const overdue = list.filter((i) => !i.isPaid && new Date(i.dueDate).getTime() < startOfToday());
      const sum = (items) => items.reduce((total, i) => total + i.amount, 0);

      return {
        customer,
        installments: list,
        summary: {
          totalInstallments: list.length,
          paidCount: list.filter((i) => i.isPaid).length,
          overdueCount: overdue.length,
          totalAmount: sum(list),
          paidAmount: sum(list.filter((i) => i.isPaid)),
          remainingAmount: sum(list.filter((i) => !i.isPaid)),
          riskStatus: overdue.length === 0 ? "Düşük" : overdue.length <= 2 ? "Orta" : "Yüksek",
        },
      };
    }),

  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const { customerId, totalAmount, installmentCount, startDate, notes, productNames } = payload;
        if (!customerId || !totalAmount || !installmentCount || !startDate) {
          throw createHttpError(
            "customerId, totalAmount, installmentCount ve startDate zorunludur",
            400,
          );
        }
        const count = Number(installmentCount);
        if (count < 1 || count > 120) {
          throw createHttpError("Taksit sayısı 1-120 arasında olmalıdır", 400);
        }
        const customer = findCustomer(db, customerId);
        if (!customer) throw createHttpError("Müşteri bulunamadı", 404);

        const groupId = newId("grp");
        const perInstallment = round2(num(totalAmount) / count);
        const start = new Date(startDate);
        const created = [];

        for (let i = 1; i <= count; i += 1) {
          const dueDate = new Date(start);
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          const installment = newEntity("ins", {
            customerId: customer._id,
            groupId,
            totalAmount: num(totalAmount),
            installmentCount: count,
            installmentNumber: `${i}/${count}`,
            dueDate: dueDate.toISOString(),
            amount: perInstallment,
            paidAmount: 0,
            isPaid: false,
            status: "Bekliyor",
            productNames: Array.isArray(productNames) ? productNames : [],
            createdBy: actor._id,
            notes: str(notes),
          });
          db.installments.push(installment);
          created.push(installment);
        }

        setBalance(customer, num(customer.toplamKalanBakiye) + num(totalAmount));
        return { message: `${count} taksit başarıyla oluşturuldu`, groupId, installments: created };
      },
      { write: true },
    ),

  markPaid: (id, paidDate) =>
    run(
      (db) => {
        const installment = active(db.installments).find((i) => sameId(i._id, id));
        if (!installment) throw createHttpError("Taksit bulunamadı", 404);
        if (installment.isPaid) throw createHttpError("Bu taksit zaten ödenmiş", 400);

        installment.isPaid = true;
        installment.status = "Ödendi";
        installment.paidAmount = installment.amount;
        installment.paidDate = paidDate ? normalizeDate(paidDate) : nowIso();
        touch(installment);

        const customer = findCustomer(db, installment.customerId);
        if (customer) setBalance(customer, num(customer.toplamKalanBakiye) - installment.amount);
        return installment;
      },
      { write: true },
    ),

  remove: (id) =>
    run(
      (db) => {
        const installment = active(db.installments).find((i) => sameId(i._id, id));
        if (!installment) throw createHttpError("Taksit bulunamadı", 404);
        if (installment.isPaid) throw createHttpError("Ödenmiş taksit silinemez", 400);

        installment.isDeleted = true;
        touch(installment);
        const customer = findCustomer(db, installment.customerId);
        if (customer) setBalance(customer, num(customer.toplamKalanBakiye) - installment.amount);
        return { message: "Taksit başarıyla silindi" };
      },
      { write: true },
    ),
};

// ─── Şubeler / Transferler / Sevkiyatlar ──────────────────────────────────────

const branches = {
  list: () =>
    run((db) =>
      db.branches
        .filter((b) => inTenant(b) && b.isActive !== false)
        .sort(byDateDesc("createdAt")),
    ),

  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const ad = str(payload.ad);
        if (!ad) throw createHttpError("Şube adı zorunludur", 400);
        if (db.branches.some((b) => inTenant(b) && lc(b.ad) === lc(ad))) {
          throw createHttpError("Bu isimde bir şube zaten var", 409);
        }
        const branch = newEntity("brn", {
          ad,
          adres: str(payload.adres),
          telefon: str(payload.telefon),
          sorumluPersonel: payload.sorumluPersonel || null,
          isActive: true,
          createdBy: actor._id,
        });
        db.branches.push(branch);
        return branch;
      },
      { write: true },
    ),

  update: (id, payload) =>
    run(
      (db) => {
        const branch = db.branches.find((b) => sameId(b._id, id));
        if (!branch) throw createHttpError("Şube bulunamadı", 404);
        ["ad", "adres", "telefon", "sorumluPersonel", "isActive"].forEach((field) => {
          if (payload[field] !== undefined) {
            branch[field] = typeof payload[field] === "string" ? str(payload[field]) : payload[field];
          }
        });
        return touch(branch);
      },
      { write: true },
    ),

  remove: (id) =>
    run(
      (db) => {
        const branch = db.branches.find((b) => sameId(b._id, id));
        if (!branch) throw createHttpError("Şube bulunamadı", 404);
        if (db.transfers.some((t) => sameId(t.fromBranch, id) || sameId(t.toBranch, id))) {
          throw createHttpError("Bu şubeye bağlı transferler olduğu için silinemez", 400);
        }
        db.branches = db.branches.filter((b) => !sameId(b._id, id));
        return { message: "Şube silindi" };
      },
      { write: true },
    ),
};

const withTransferRefs = (db, transfer) => ({
  ...transfer,
  fromBranch: branchRef(db, transfer.fromBranch) ?? transfer.fromBranch,
  toBranch: branchRef(db, transfer.toBranch) ?? transfer.toBranch,
  createdBy: userRef(db, transfer.createdBy) ?? transfer.createdBy,
  approvedBy: transfer.approvedBy ? (userRef(db, transfer.approvedBy) ?? transfer.approvedBy) : null,
});

const transfers = {
  list: (params = {}) =>
    run((db) =>
      db.transfers
        .filter((t) => inTenant(t))
        .filter((t) => !params.status || t.status === params.status)
        .filter((t) => !params.fromBranch || sameId(t.fromBranch, params.fromBranch))
        .filter((t) => !params.toBranch || sameId(t.toBranch, params.toBranch))
        .sort(byDateDesc("createdAt"))
        .map((t) => withTransferRefs(db, t)),
    ),

  getById: (id) =>
    run((db) => {
      const transfer = db.transfers.find((t) => sameId(t._id, id));
      if (!transfer) throw createHttpError("Transfer bulunamadı", 404);
      return withTransferRefs(db, transfer);
    }),

  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        const { fromBranch, toBranch, products: items, notes } = payload;
        if (!fromBranch || !toBranch) {
          throw createHttpError("Kaynak ve hedef şube zorunludur", 400);
        }
        if (sameId(fromBranch, toBranch)) {
          throw createHttpError("Kaynak ve hedef şube aynı olamaz", 400);
        }
        if (!Array.isArray(items) || items.length === 0) {
          throw createHttpError("En az bir ürün zorunludur", 400);
        }

        const transfer = newEntity("trf", {
          fromBranch,
          toBranch,
          products: items.map((item) => ({
            productId: item.productId,
            urunKodu: str(item.urunKodu),
            urunAdi: str(item.urunAdi),
            adet: Math.max(1, num(item.adet, 1)),
          })),
          status: "Beklemede",
          createdBy: actor._id,
          approvedBy: null,
          approvedAt: null,
          notes: str(notes),
        });
        db.transfers.push(transfer);
        logAction(db, actor, "TRANSFER_OLUSTUR", "Transfer", transfer._id, {
          adetKalemi: transfer.products.length,
        });
        return withTransferRefs(db, transfer);
      },
      { write: true },
    ),

  updateStatus: (id, status, notes) =>
    run(
      (db) => {
        const actor = getActor(db);
        if (!["Onaylandı", "Reddedildi"].includes(status)) {
          throw createHttpError("Geçersiz durum. 'Onaylandı' veya 'Reddedildi' olmalı", 400);
        }
        const transfer = db.transfers.find((t) => sameId(t._id, id));
        if (!transfer) throw createHttpError("Transfer bulunamadı", 404);
        if (transfer.status !== "Beklemede") {
          throw createHttpError("Sadece beklemedeki transferler güncellenebilir", 400);
        }

        transfer.status = status;
        transfer.approvedBy = actor._id;
        transfer.approvedAt = nowIso();
        if (notes) transfer.notes = str(notes);
        touch(transfer);
        if (status === "Onaylandı") {
          logAction(db, actor, "TRANSFER_ONAYLA", "Transfer", transfer._id, {});
        }
        return withTransferRefs(db, transfer);
      },
      { write: true },
    ),

  remove: (id) =>
    run(
      (db) => {
        const transfer = db.transfers.find((t) => sameId(t._id, id));
        if (!transfer) throw createHttpError("Transfer bulunamadı", 404);
        if (transfer.status === "Onaylandı") {
          throw createHttpError("Onaylanan transfer silinemez", 400);
        }
        db.transfers = db.transfers.filter((t) => !sameId(t._id, id));
        return { message: "Transfer başarıyla silindi" };
      },
      { write: true },
    ),
};

const SHIPMENT_STATUSES = ["Planlandı", "Yolda", "Teslim Edildi", "İptal"];

const withShipmentRefs = (db, shipment) => ({
  ...shipment,
  customerId:
    customerRef(db.customers.find((c) => sameId(c._id, shipment.customerId))) ?? shipment.customerId,
  assignedPersonnel: (shipment.assignedPersonnel || []).map(
    (userId) => userRef(db, userId) ?? userId,
  ),
  createdBy: userRef(db, shipment.createdBy) ?? shipment.createdBy,
});

const shipments = {
  list: (params = {}) =>
    run((db) => {
      const bounds = params.date ? dayBounds(params.date) : null;
      return db.shipments
        .filter((s) => inTenant(s))
        .filter((s) => !params.status || s.status === params.status)
        .filter((s) => !params.customerId || sameId(s.customerId, params.customerId))
        .filter((s) => !bounds || inRange(s.deliveryDate, bounds))
        .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate))
        .map((s) => withShipmentRefs(db, s));
    }),

  getById: (id) =>
    run((db) => {
      const shipment = db.shipments.find((s) => sameId(s._id, id));
      if (!shipment) throw createHttpError("Sevkiyat bulunamadı", 404);
      return withShipmentRefs(db, shipment);
    }),

  create: (payload) =>
    run(
      (db) => {
        const actor = getActor(db);
        if (!payload.customerId) throw createHttpError("Müşteri zorunludur", 400);
        if (!payload.deliveryDate) throw createHttpError("Teslimat tarihi zorunludur", 400);
        if (!Array.isArray(payload.products) || payload.products.length === 0) {
          throw createHttpError("En az bir ürün zorunludur", 400);
        }

        const customer = resolveCustomer(db, payload.customerId);
        if (!customer) throw createHttpError("Müşteri bulunamadı", 404);

        const shipment = newEntity("shp", {
          customerId: customer._id,
          products: payload.products.map((item) => ({
            productId: item.productId,
            urunKodu: str(item.urunKodu),
            urunAdi: str(item.urunAdi) || productByCode(db, str(item.urunKodu))?.ad || str(item.urunKodu),
            adet: Math.max(1, num(item.adet, 1)),
          })),
          deliveryDate: normalizeDate(payload.deliveryDate),
          vehicleInfo: payload.vehicleInfo || {},
          assignedPersonnel: payload.assignedPersonnel || [],
          status: "Planlandı",
          createdBy: actor._id,
          notes: str(payload.notes),
        });
        db.shipments.push(shipment);
        return withShipmentRefs(db, shipment);
      },
      { write: true },
    ),

  update: (id, payload) =>
    run(
      (db) => {
        const shipment = db.shipments.find((s) => sameId(s._id, id));
        if (!shipment) throw createHttpError("Sevkiyat bulunamadı", 404);

        if (payload.products) shipment.products = payload.products;
        if (payload.deliveryDate) shipment.deliveryDate = normalizeDate(payload.deliveryDate);
        if (payload.vehicleInfo !== undefined) shipment.vehicleInfo = payload.vehicleInfo;
        if (payload.assignedPersonnel !== undefined) {
          shipment.assignedPersonnel = payload.assignedPersonnel;
        }
        if (payload.status) {
          if (!SHIPMENT_STATUSES.includes(payload.status)) {
            throw createHttpError("Geçersiz durum", 400);
          }
          shipment.status = payload.status;
        }
        if (payload.notes !== undefined) shipment.notes = str(payload.notes);
        touch(shipment);
        return withShipmentRefs(db, shipment);
      },
      { write: true },
    ),

  remove: (id) =>
    run(
      (db) => {
        const shipment = db.shipments.find((s) => sameId(s._id, id));
        if (!shipment) throw createHttpError("Sevkiyat bulunamadı", 404);
        if (shipment.status === "Teslim Edildi") {
          throw createHttpError("Teslim edilen sevkiyat silinemez", 400);
        }
        db.shipments = db.shipments.filter((s) => !sameId(s._id, id));
        return { message: "Sevkiyat başarıyla silindi" };
      },
      { write: true },
    ),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const STALE_DEBT_DAYS = 21;

const dashboard = {
  summary: () =>
    run((db) => {
      const dayRange = todayBounds();
      const now = new Date();
      const monthRange = [
        new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime(),
      ];

      const liveTx = active(db.transactions);
      const sales = liveTx.filter((t) => t.islemTuru === "Satış");
      const sumTotal = (list) => list.reduce((sum, t) => sum + num(t.toplamTutar), 0);

      const gunlukKasa = active(db.collections)
        .filter((c) => inRange(c.collectionDate, dayRange))
        .reduce((sum, c) => sum + num(c.amount), 0);
      const gunlukSatis = sumTotal(sales.filter((t) => inRange(t.tarih, dayRange)));
      const aylikSatis = sumTotal(sales.filter((t) => inRange(t.tarih, monthRange)));

      // Alacaklar
      const debtors = active(db.customers).filter((c) => num(c.toplamKalanBakiye) > 0);
      const toplamAlacak = debtors.reduce((sum, c) => sum + num(c.toplamKalanBakiye), 0);

      // Riskli alacaklar: vade/taksit yok; uzun süredir hareketsiz açık hesap borçları + varsa gecikmiş taksitler
      const staleBefore = Date.now() - STALE_DEBT_DAYS * 24 * 60 * 60 * 1000;
      const staleDebtors = debtors
        .map((c) => ({ customer: c, lastActivity: new Date(c.sonIslemTarihi || c.createdAt).getTime() }))
        .filter(({ lastActivity }) => lastActivity < staleBefore)
        .sort((a, b) => a.lastActivity - b.lastActivity);

      const overdueInstallments = active(db.installments)
        .filter((i) => !i.isPaid && new Date(i.dueDate).getTime() < dayRange[0])
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      const riskliTaksitler = [
        ...overdueInstallments.map((i) => withInstallmentRefs(db, i)),
        ...staleDebtors.map(({ customer, lastActivity }) => ({
          _id: `risk_${customer._id}`,
          customerId: customerRef(customer),
          amount: num(customer.toplamKalanBakiye),
          dueDate: new Date(lastActivity).toISOString(),
          installmentNumber: "Açık Hesap",
          kaynak: "ACIK_HESAP",
        })),
      ].slice(0, 5);

      const vadesiGecenAlacak =
        overdueInstallments.reduce((sum, i) => sum + num(i.amount) - num(i.paidAmount), 0) +
        staleDebtors.reduce((sum, { customer }) => sum + num(customer.toplamKalanBakiye), 0);

      // Sevkiyatlar
      const todaysShipments = db.shipments
        .filter((s) => inTenant(s) && inRange(s.deliveryDate, dayRange))
        .map((s) => withShipmentRefs(db, s));

      // Kritik stok
      const criticalProducts = active(db.products).filter(
        (p) => num(p.mevcutStok) <= num(p.kritikStokSeviyesi, 5),
      );

      // Bekleyen envanter
      const pendingLines = liveTx.flatMap((t) =>
        (t.urunler || []).map((line) => pendingQuantity(line)).filter((qty) => qty > 0),
      );

      const sonHareketler = db.actionLogs
        .filter((l) => inTenant(l))
        .sort(byDateDesc("createdAt"))
        .slice(0, 5);

      return {
        // DashboardPage
        gunlukKasa,
        vadesiGecenAlacak,
        bugunkuSevkiyatlar: { sayi: todaysShipments.length, liste: todaysShipments },
        kritikStokSayisi: criticalProducts.length,
        riskliTaksitler,
        sonHareketler,
        // SummaryCards
        kasa: { gunlukSatis, aylikSatis },
        alacaklar: { toplamAlacak, alacakliMusteriSayisi: debtors.length },
        kritikStok: {
          esik: 5,
          urunSayisi: criticalProducts.length,
          urunler: criticalProducts
            .sort((a, b) => num(a.mevcutStok) - num(b.mevcutStok))
            .map((p) => ({ urunKodu: p.urunKodu || p.ad, marka: p.marka || "", adet: num(p.mevcutStok) })),
        },
        bekleyenEnvanter: {
          bekleyenTeslimatSayisi: pendingLines.length,
          bekleyenToplamAdet: pendingLines.reduce((sum, qty) => sum + qty, 0),
        },
      };
    }),
};

// ─── Raporlar ─────────────────────────────────────────────────────────────────

const lineSummary = (transaction) =>
  (transaction.urunler || [])
    .map((line) => `${line.urunKodu} x${line.adet}`)
    .join(", ");

const buildReport = (db, range, { userId, label } = {}) => {
  const sales = active(db.transactions).filter(
    (t) =>
      t.islemTuru === "Satış" &&
      inRange(t.tarih, range) &&
      (!userId || sameId(t.createdBy, userId)),
  );
  const collected = active(db.collections).filter(
    (c) =>
      inRange(c.collectionDate, range) && (!userId || sameId(c.collectedBy, userId)),
  );
  const movements = active(db.stockHistory).filter(
    (m) => inRange(m.createdAt, range) && (!userId || sameId(m.performedBy, userId)),
  );

  const soldQuantity = sales.reduce(
    (sum, t) =>
      sum +
      (t.urunler || []).reduce(
        (inner, line) => inner + Math.max(0, num(line.adet) - num(line.envanterdeBekleyenAdet)),
        0,
      ),
    0,
  );

  return {
    tarih: label,
    satis: {
      toplamSatis: sales.reduce((sum, t) => sum + num(t.toplamTutar), 0),
      toplamPesinat: sales.reduce((sum, t) => sum + num(t.pesinat), 0),
      toplamKalanBorc: sales.reduce((sum, t) => sum + num(t.kalanHesap), 0),
      toplamAdet: sales.length,
    },
    tahsilat: {
      toplamTahsilat: collected.reduce((sum, c) => sum + num(c.amount), 0),
      tahsilatAdet: collected.length,
    },
    stok: {
      giris: movements
        .filter((m) => m.hareketTipi === "Giriş")
        .reduce((sum, m) => sum + num(m.miktar), 0),
      cikis:
        movements
          .filter((m) => m.hareketTipi !== "Giriş")
          .reduce((sum, m) => sum + num(m.miktar), 0) + soldQuantity,
    },
    detay: {
      islemler: sales
        .sort(byDateDesc("tarih"))
        .map((t) => ({
          id: t._id,
          tarih: t.tarih,
          tutar: t.toplamTutar,
          pesinat: t.pesinat,
          kalanBorc: t.kalanHesap,
          islemTuru: t.islemTuru,
          personel: t.personelAdi,
          musteri: t.musteriAdSoyad,
          musteriId: t.musteriId,
          urunler: lineSummary(t),
        })),
      tahsilatlar: collected
        .sort(byDateDesc("collectionDate"))
        .map((c) => {
          const customer = db.customers.find((cu) => sameId(cu._id, c.customerId));
          return {
            id: c._id,
            tarih: c.collectionDate,
            tutar: c.amount,
            yontem: c.paymentMethod,
            personel: c.collectedByName,
            musteri: customer ? fullName(customer) : "",
            kaynak: c.kaynak,
          };
        }),
    },
  };
};

const reports = {
  /** Günlük (Z) rapor. date: "YYYY-MM-DD" (varsayılan bugün), userId: personel filtresi */
  daily: ({ date, userId } = {}) =>
    run((db) => {
      const t = new Date();
      const day = date || `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
      return buildReport(db, dayBounds(day), { userId, label: day });
    }),

  /** Aylık rapor. month: "YYYY-MM" */
  monthly: ({ month, userId } = {}) =>
    run((db) => {
      const t = new Date();
      const key = month || `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`;
      const [y, m] = key.split("-").map(Number);
      const range = [
        new Date(y, m - 1, 1, 0, 0, 0, 0).getTime(),
        new Date(y, m, 0, 23, 59, 59, 999).getTime(),
      ];
      return buildReport(db, range, { userId, label: key });
    }),

  sendReminder: ({ customerId, message, channel }) =>
    run((db) => {
      if (!customerId) throw createHttpError("customerId zorunludur", 400);
      const customer = findCustomer(db, customerId);
      if (!customer) throw createHttpError("Müşteri bulunamadı", 404);

      // SMS / WhatsApp entegrasyonu henüz yok; yalnızca konsola yazılır.
      console.info(
        `[HATIRLATICI - lokal] Kanal: ${channel || "sms"} | Tel: ${customer.telefon} | Mesaj: ${message}`,
      );
      return {
        success: true,
        message: "Hatırlatıcı gönderim talebi alındı (lokal modda gerçek gönderim yapılmaz)",
        customer: { ad: customer.ad, soyad: customer.soyad, telefon: customer.telefon },
        channel: channel || "sms",
      };
    }),

  /** Excel dışa aktarma için satır verisi döner. */
  exportRows: (type) =>
    run((db) => {
      const dateText = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR") : "");
      const dateTimeText = (iso) => (iso ? new Date(iso).toLocaleString("tr-TR") : "");

      switch (type) {
        case "products":
          return {
            sheetName: "Ürünler",
            fileName: "urunler.xlsx",
            rows: active(db.products).map((p) => ({
              "Ürün Kodu": p.urunKodu || "",
              "Ürün Adı": p.ad,
              Marka: p.marka || "",
              Kategori: p.kategori || "",
              Barkod: p.barkod || "",
              "Seri No": p.seriNo || "",
              "Alış Fiyatı (₺)": p.alisFiyati || 0,
              "Satış Fiyatı (₺)": p.satisFiyati || 0,
              "Mevcut Stok": p.mevcutStok || 0,
              "Kritik Stok Seviyesi": p.kritikStokSeviyesi ?? 5,
              "Garanti Süresi (Ay)": p.garantiSuresi || 0,
              Tedarikçi: p.tedarikci || "",
              "Oluşturma Tarihi": dateText(p.createdAt),
            })),
          };
        case "customers":
          return {
            sheetName: "Müşteriler",
            fileName: "musteriler.xlsx",
            rows: active(db.customers).map((c) => ({
              "Müşteri No": c.musteriNo || "",
              Ad: c.ad,
              Soyad: c.soyad,
              "TC Kimlik": c.tcKimlik || "",
              Telefon: c.telefon || "",
              Adres: c.adres || "",
              "Kalan Bakiye (₺)": c.toplamKalanBakiye || 0,
              "Kayıt Tarihi": dateText(c.createdAt),
            })),
          };
        case "debtors":
          return {
            sheetName: "Borçlular",
            fileName: "borclular.xlsx",
            rows: active(db.customers)
              .filter((c) => num(c.toplamKalanBakiye) > 0)
              .sort((a, b) => num(b.toplamKalanBakiye) - num(a.toplamKalanBakiye))
              .map((c) => ({
                "Müşteri No": c.musteriNo || "",
                Ad: c.ad,
                Soyad: c.soyad,
                "TC Kimlik": c.tcKimlik || "",
                Telefon: c.telefon || "",
                "Borç (₺)": c.toplamKalanBakiye || 0,
                "Kayıt Tarihi": dateText(c.createdAt),
              })),
          };
        case "transactions":
          return {
            sheetName: "İşlemler",
            fileName: "islemler.xlsx",
            rows: active(db.transactions)
              .sort(byDateDesc("tarih"))
              .map((t) => ({
                Tarih: dateTimeText(t.tarih),
                Personel: t.personelAdi || "",
                "Müşteri No": t.musteriNo || "",
                Müşteri: t.musteriAdSoyad || "",
                "İşlem Türü": t.islemTuru,
                Ürünler: lineSummary(t),
                "Toplam Tutar (₺)": t.toplamTutar || 0,
                "Alınan Tutar (₺)": t.alinanTutar ?? t.pesinat ?? 0,
                "Kalan Borç (₺)": t.kalanBorc ?? t.kalanHesap ?? 0,
                "Ödeme Yöntemi": t.odemeYontemi || "",
              })),
          };
        case "actionlogs":
          return {
            sheetName: "İşlem Geçmişi",
            fileName: "islem-gecmisi.xlsx",
            rows: db.actionLogs
              .filter((l) => inTenant(l))
              .sort(byDateDesc("createdAt"))
              .map((l) => ({
                Tarih: dateTimeText(l.createdAt),
                Kullanıcı: l.userName || "Bilinmiyor",
                İşlem: l.action,
                "Kayıt Türü": l.entityType || "",
                "Kayıt ID": l.entityId || "",
                Detay: JSON.stringify(l.details || {}),
              })),
          };
        default:
          throw createHttpError("Geçersiz dışa aktarma türü", 400);
      }
    }),
};

const actionLogs = {
  list: ({ limit } = {}) =>
    run((db) =>
      db.actionLogs
        .filter((l) => inTenant(l))
        .sort(byDateDesc("createdAt"))
        .slice(0, limit ?? 500),
    ),
};

// ─── Dışa aktarılan API ───────────────────────────────────────────────────────

export const localDb = {
  auth,
  stores,
  users,
  customers,
  transactions,
  stocks,
  products,
  inventory,
  collections,
  installments,
  branches,
  transfers,
  shipments,
  dashboard,
  reports,
  actionLogs,
  reset: async () => {
    resetLocalDb();
  },
};

export default localDb;

// ─── Başlatma ─────────────────────────────────────────────────────────────────
// Modül ilk yüklendiğinde (App render edilmeden önce) çalışır:
//  1) localStorage boşsa seed verisini yükler.
//  2) Tarayıcıda eski (gerçek backend'den kalma) bir oturum varsa ve kullanıcısı
//     lokal veritabanında yoksa oturumu temizler; böylece "Oturum bulunamadı"
//     hataları yerine giriş ekranı açılır.

const initialize = () => {
  try {
    const db = loadDb();
    const session = getAuthSession();
    const matchedUser =
      session && db.users.find((u) => !u.isDeleted && sameId(u._id, session.userId));

    if (matchedUser) {
      const refreshed = buildSessionForUser(matchedUser, db);
      setAuthSession({
        ...session,
        ...refreshed,
        token: session.token || refreshed.token,
      });
      return;
    }

    // Geçersiz/eski oturum varsa temizle
    if (session) {
      clearAuthSession({ markLoggedOut: false });
    }

    // Kullanıcı açıkça "Çıkış Yap" demediyse varsayılan yönetici oturumuyla doğrudan aç
    if (!isExplicitlyLoggedOut()) {
      const defaultAdmin =
        db.users.find((u) => !u.isDeleted && u.role === "admin") ||
        db.users.find((u) => !u.isDeleted);
      if (defaultAdmin) {
        setAuthSession(buildSessionForUser(defaultAdmin, db));
      }
    }
  } catch (error) {
    console.error("[localDb] Başlatma hatası:", error);
  }
};

initialize();

if (typeof window !== "undefined" && import.meta.env?.DEV) {
  window.__resetLocalDb = () => {
    resetLocalDb();
    window.location.reload();
  };
}

