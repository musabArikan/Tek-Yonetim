const mongoose = require("mongoose");

let memoryServer = null;

const migrateLegacyIndexes = async () => {
  const legacyDrops = [
    { collection: "customers", indexNames: ["musteriNo_1", "tcKimlik_1"] },
    { collection: "products", indexNames: ["urunKodu_1", "barkod_1"] },
    { collection: "stocks", indexNames: ["urunKodu_1"] },
  ];

  const db = mongoose.connection.db;
  if (!db) return;

  const existingCollections = await db.listCollections().toArray();
  const colNames = new Set(existingCollections.map((c) => c.name));

  for (const { collection, indexNames } of legacyDrops) {
    if (!colNames.has(collection)) continue;
    try {
      const indexes = await db.collection(collection).indexes();
      for (const idx of indexes) {
        if (indexNames.includes(idx.name) && !idx.key?.tenantId) {
          await db.collection(collection).dropIndex(idx.name);
          console.log(`[DB] Eski tekil indeks kaldırıldı: ${collection}.${idx.name}`);
        }
      }
    } catch (err) {
      // İndeks zaten yoksa devam et
    }
  }
};

const connectDB = async () => {
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB runtime connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
  });

  const mongoUri = process.env.MONGODB_URI;
  const forceMemory = String(process.env.USE_MEMORY_DB || "").toLowerCase() === "true";

  if (mongoUri && !forceMemory) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        autoIndex: true,
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      await migrateLegacyIndexes();
      return conn;
    } catch (error) {
      console.warn(`MongoDB URI bağlantı hatası (${error.message}).`);
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    }
  }

  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create({
      binary: { version: "5.0.14" },
    });
    const uri = memoryServer.getUri();
    const conn = await mongoose.connect(uri, { autoIndex: true });
    console.log(`MongoDB (In-Memory) connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
