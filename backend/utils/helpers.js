const mongoose = require("mongoose");

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const str = (value) => (value ?? "").toString().trim();
const lc = (value) => str(value).toLocaleLowerCase("tr-TR");
const pad2 = (n) => String(n).padStart(2, "0");
const fullName = (person) => `${person?.ad ?? ""} ${person?.soyad ?? ""}`.trim();
const sameId = (a, b) => a !== undefined && a !== null && String(a) === String(b);
const isObjectId = (value) => mongoose.isValidObjectId(value) && String(value).length === 24;

class HttpError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.statusCode = status;
    this.extra = extra;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/** Geçersiz ObjectId verilirse 404 yerine temiz bir hata üretir. */
const assertObjectId = (value, message = "Geçersiz kayıt kimliği") => {
  if (!isObjectId(value)) throw new HttpError(message, 400);
  return value;
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

const monthBounds = (year, month) => [
  new Date(year, month - 1, 1, 0, 0, 0, 0).getTime(),
  new Date(year, month, 0, 23, 59, 59, 999).getTime(),
];

const inRange = (value, [start, end]) => {
  const time = new Date(value).getTime();
  return time >= start && time <= end;
};

/** Form'dan gelen "YYYY-MM-DD" değerine anlık saati ekler; ISO gelirse korur. */
const normalizeDate = (value) => {
  if (!value) return new Date();
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split("-").map(Number);
    const t = new Date();
    return new Date(y, m - 1, d, t.getHours(), t.getMinutes(), t.getSeconds());
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const uniqueStringsTr = (items = []) => {
  const seen = new Set();
  const result = [];
  items.forEach((raw) => {
    const clean = str(raw);
    if (!clean) return;
    const key = lc(clean);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  });
  return result;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const byDateDesc = (field) => (a, b) => new Date(b[field]) - new Date(a[field]);

module.exports = {
  num,
  round2,
  str,
  lc,
  pad2,
  fullName,
  sameId,
  isObjectId,
  HttpError,
  asyncHandler,
  assertObjectId,
  dayBounds,
  todayBounds,
  monthBounds,
  inRange,
  normalizeDate,
  uniqueStringsTr,
  escapeRegex,
  byDateDesc,
};

