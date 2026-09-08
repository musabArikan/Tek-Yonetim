const mongoose = require("mongoose");

const requireEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} ortam değişkeni tanımlı değil. Kök dizindeki .env dosyasını kontrol edin.`);
  }

  return value;
};

const connectDB = async () => {
  try {
    const mongoUri = requireEnv("MONGODB_URI");
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB runtime connection error:", err.message);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected.");
    });
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true,
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
