const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { seedDemoTenant } = require("./utils/seedDemoTenant");

const authRoutes = require("./routes/authRoutes");
const storeRoutes = require("./routes/storeRoutes");
const customerRoutes = require("./routes/customerRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const stockRoutes = require("./routes/stockRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const productRoutes = require("./routes/productRoutes");
const branchRoutes = require("./routes/branchRoutes");
const transferRoutes = require("./routes/transferRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");
const installmentRoutes = require("./routes/installmentRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const exportRoutes = require("./routes/exportRoutes");
const reportRoutes = require("./routes/reportRoutes");

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const app = express();
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");

const allowedOrigins = [
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
  ...(process.env.FRONTEND_URL || "").split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.endsWith(".onrender.com")
      ) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "5mb" }));

const healthHandler = (req, res) => {
  res.status(200).json({ status: "ok", message: "Tek Yönetim API is running" });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.use("/api/auth", authRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/installments", installmentRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/reports", reportRoutes);

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^\/(?!api|health).*/, (req, res) => {
    const indexHtml = path.join(frontendDistPath, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Sunucu hatası",
  });
});

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "tek-yonetim-default-jwt-secret-key-2026";
  }

  const PORT = process.env.PORT || 5000;

  await connectDB();

  try {
    const seedResult = await seedDemoTenant();
    if (seedResult.seeded) {
      console.log(
        `[Seed] Demo mağaza oluşturuldu: Arıkan Mağazası (${seedResult.ownerEmail})`,
      );
    } else {
      console.log(
        `[Seed] Demo mağaza hazır: Arıkan Mağazası (${seedResult.ownerEmail})`,
      );
    }
  } catch (seedErr) {
    console.error("[Seed] Demo mağaza yüklenirken hata:", seedErr.message);
  }

  return new Promise((resolve) => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
      resolve(server);
    });
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
