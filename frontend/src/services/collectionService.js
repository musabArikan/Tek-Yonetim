import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

// ─── Collection (Tahsilat / Kasa) ────────────────────────────────────────────

export const getCollections = (params = {}) =>
  call(() => localDb.collections.list(params));

export const getCollectionById = (collectionId) =>
  call(() => localDb.collections.getById(collectionId));

export const createCollection = (collectionData) =>
  call(() => localDb.collections.create(collectionData));

export const deleteCollection = (collectionId) =>
  call(() => localDb.collections.remove(collectionId));
