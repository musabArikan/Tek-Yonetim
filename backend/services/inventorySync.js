const Product = require("../models/Product");
const Stock = require("../models/Stock");

/** Stok değiştiğinde aynı ürün koduna sahip ürün kartını eşitler. */
const syncProductFromStock = async (tenantId, urunKodu, adet) => {
  if (!urunKodu) return;
  await Product.updateOne(
    { tenantId, urunKodu, isDeleted: false },
    { $set: { mevcutStok: Math.max(0, Number(adet) || 0) } },
  );
};

/** Ürün kartındaki stok değiştiğinde stok kaydını eşitler. */
const syncStockFromProduct = async (tenantId, product) => {
  if (!product?.urunKodu) return null;
  const stock = await Stock.findOne({ tenantId, urunKodu: product.urunKodu });
  if (!stock) return null;
  stock.adet = Math.max(Number(product.mevcutStok) || 0, Number(stock.envanterdekiAdet) || 0);
  await stock.save();
  return stock;
};

module.exports = { syncProductFromStock, syncStockFromProduct };

