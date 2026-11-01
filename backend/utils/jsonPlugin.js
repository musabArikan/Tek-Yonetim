/**
 * Tüm şemalar için ortak JSON çıktısı: `_id` yanında `id` alanı da döner
 * (frontend her ikisini de kullanır), `__v` gizlenir.
 */
module.exports = (schema) => {
  schema.set("toJSON", {
    versionKey: false,
    transform: (doc, ret) => {
      if (ret._id !== undefined) ret.id = String(ret._id);
      return ret;
    },
  });
  schema.set("toObject", { versionKey: false });
};

