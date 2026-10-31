import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

// ─── Ürünler ──────────────────────────────────────────────────────────────────

export const getProducts = () => call(() => localDb.products.list());

export const createProduct = (productData) =>
  call(() => localDb.products.create(productData));

export const updateProduct = (id, productData) =>
  call(() => localDb.products.update(id, productData));

export const deleteProduct = (id) => call(() => localDb.products.remove(id));

// ─── Stok Hareketleri ────────────────────────────────────────────────────────

export const getStockMovements = (productId = null) =>
  call(() => localDb.products.listMovements(productId));

export const addStockMovement = (movementData) =>
  call(() => localDb.products.addMovement(movementData));

export const cancelStockMovement = (movementId) =>
  call(() => localDb.products.cancelMovement(movementId));
