import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getTransfers = (params = {}) =>
  call(() => localDb.transfers.list(params));

export const getTransferById = (transferId) =>
  call(() => localDb.transfers.getById(transferId));

export const createTransfer = (transferData) =>
  call(() => localDb.transfers.create(transferData));

export const updateTransferStatus = (transferId, status, notes) =>
  call(() => localDb.transfers.updateStatus(transferId, status, notes));

export const deleteTransfer = (transferId) =>
  call(() => localDb.transfers.remove(transferId));
