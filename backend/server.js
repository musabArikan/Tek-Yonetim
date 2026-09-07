const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const stockRoutes = require("./routes/stockRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");

const app = express();
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS blocked: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Tek Yönetim API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use(express.static(frontendDistPath));
app.get(/^\/(?!api|health).*/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET ortam değişkeni tanımlı değil. Kök dizindeki .env dosyasını kontrol edin.");
    process.exit(1);
  }

  if (!process.env.PORT) {
    console.error("PORT ortam değişkeni tanımlı değil. Kök dizindeki .env dosyasını kontrol edin.");
    process.exit(1);
  }

  await connectDB();

  const PORT = process.env.PORT;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

startServer();
