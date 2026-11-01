import api from "../utils/api.js";
import { localDb, DEFAULT_BRANDS, DEFAULT_CATEGORIES } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

// ─── Ürünler ──────────────────────────────────────────────────────────────────

export const getProducts = () =>
  call(
    async () => {
      const { data } = await api.get("/products");
      return Array.isArray(data) ? data : [];
    },
    () => localDb.products.list(),
  );

export const createProduct = (productData) =>
  call(
    async () => {
      const { data } = await api.post("/products", productData);
      return data;
    },
    () => localDb.products.create(productData),
  );

export const updateProduct = (id, productData) =>
  call(
    async () => {
      const { data } = await api.put(`/products/${id}`, productData);
      return data;
    },
    () => localDb.products.update(id, productData),
  );

export const deleteProduct = (id) =>
  call(
    async () => {
      const { data } = await api.delete(`/products/${id}`);
      return data;
    },
    () => localDb.products.remove(id),
  );

// ─── Marka ve Kategori Listeleri ──────────────────────────────────────────────

export const getBrands = () =>
  call(
    async () => {
      const { data } = await api.get("/products/brands");
      return Array.isArray(data) ? data : [...DEFAULT_BRANDS];
    },
    () => localDb.products.listBrands(),
  );

export const addBrand = (name) =>
  call(
    async () => {
      const { data } = await api.post("/products/brands", { name });
      return Array.isArray(data) ? data : [...DEFAULT_BRANDS];
    },
    () => localDb.products.addBrand(name),
  );

export const getCategories = () =>
  call(
    async () => {
      const { data } = await api.get("/products/categories");
      return Array.isArray(data) ? data : [...DEFAULT_CATEGORIES];
    },
    () => localDb.products.listCategories(),
  );

export const addCategory = (name) =>
  call(
    async () => {
      const { data } = await api.post("/products/categories", { name });
      return Array.isArray(data) ? data : [...DEFAULT_CATEGORIES];
    },
    () => localDb.products.addCategory(name),
  );

// ─── Stok Hareketleri ────────────────────────────────────────────────────────

export const getStockMovements = (productId = null) =>
  call(
    async () => {
      const params = productId ? { productId } : {};
      const { data } = await api.get("/products/movements", { params });
      return Array.isArray(data) ? data : [];
    },
    () => localDb.products.listMovements(productId),
  );

export const addStockMovement = (movementData) =>
  call(
    async () => {
      const { data } = await api.post("/products/movements", movementData);
      return data;
    },
    () => localDb.products.addMovement(movementData),
  );

export const cancelStockMovement = (movementId) =>
  call(
    async () => {
      const { data } = await api.post(`/products/movements/${movementId}/cancel`);
      return data;
    },
    () => localDb.products.cancelMovement(movementId),
  );
