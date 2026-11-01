const User = require("../models/User");
const { lc, str, escapeRegex } = require("./helpers");

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

const findActiveUserByEmail = (email, exceptUserId = null) => {
  const query = { email: lc(email), isDeleted: false };
  if (exceptUserId) query._id = { $ne: exceptUserId };
  return User.findOne(query).select("_id email");
};

const isEmailTaken = async (email, exceptUserId = null) =>
  Boolean(await findActiveUserByEmail(email, exceptUserId));

/** Alınmış bir e-posta için kullanılabilir (boşta olan) alternatifler üretir. */
const generateEmailSuggestions = async (emailOrOptions, hintText = "") => {
  const isObj = emailOrOptions && typeof emailOrOptions === "object";
  const rawEmail = isObj ? emailOrOptions.email : emailOrOptions;
  const rawHint = isObj
    ? emailOrOptions.storeName || emailOrOptions.ownerName || hintText
    : hintText;
  const excludeUserId = isObj ? emailOrOptions.excludeUserId : null;

  const normalized = lc(rawEmail);
  const [rawLocal = "kullanici", rawDomain = ""] = normalized.split("@");
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
  const domain = str(rawDomain) || "magaza.com";
  const hintSlug = slugifyTr(rawHint).slice(0, 12);

  const candidates = [
    `${baseLocal}2@${domain}`,
    `${baseLocal}.magaza@${domain}`,
    `${baseLocal}34@${domain}`,
    ...(hintSlug && !baseLocal.includes(hintSlug) ? [`${baseLocal}.${hintSlug}@${domain}`] : []),
    `${baseLocal}3@${domain}`,
    `${baseLocal}.ticaret@${domain}`,
    `${baseLocal}06@${domain}`,
    `${baseLocal}2026@${domain}`,
  ];

  const unique = [...new Set(candidates)].filter((c) => c !== normalized);
  try {
    const query = {
      email: { $in: unique.map((c) => new RegExp(`^${escapeRegex(c)}$`, "i")) },
      isDeleted: false,
    };
    if (excludeUserId) query._id = { $ne: excludeUserId };
    const taken = await User.find(query).select("email");
    const takenSet = new Set(taken.map((u) => lc(u.email)));
    return unique.filter((c) => !takenSet.has(c)).slice(0, 4);
  } catch {
    return unique.slice(0, 4);
  }
};

module.exports = { isEmailTaken, generateEmailSuggestions, slugifyTr };

