import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

// ─── Collection (Tahsilat / Kasa) ────────────────────────────────────────────

export const getCollections = (params = {}) =>
  call(
    async () => {
      const { data } = await api.get("/collections", { params });
      return Array.isArray(data) ? data : [];
    },
    () => localDb.collections.list(params),
  );

export const getCollectionById = (collectionId) =>
  call(
    async () => {
      const { data } = await api.get(`/collections/${collectionId}`);
      return data;
    },
    () => localDb.collections.getById(collectionId),
  );

export const createCollection = (collectionData) =>
  call(
    async () => {
      const { data } = await api.post("/collections", collectionData);
      return data;
    },
    () => localDb.collections.create(collectionData),
  );

export const deleteCollection = (collectionId) =>
  call(
    async () => {
      const { data } = await api.delete(`/collections/${collectionId}`);
      return data;
    },
    () => localDb.collections.remove(collectionId),
  );
