import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getShipments = (params = {}) =>
  call(() => localDb.shipments.list(params));

export const getShipmentsByDate = (date) =>
  call(() => localDb.shipments.list({ date }));

export const getShipmentById = (shipmentId) =>
  call(() => localDb.shipments.getById(shipmentId));

export const createShipment = (shipmentData) =>
  call(() => localDb.shipments.create(shipmentData));

export const updateShipment = (shipmentId, shipmentData) =>
  call(() => localDb.shipments.update(shipmentId, shipmentData));

export const deleteShipment = (shipmentId) =>
  call(() => localDb.shipments.remove(shipmentId));
