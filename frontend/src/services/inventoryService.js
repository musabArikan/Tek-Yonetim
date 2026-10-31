import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getPendingInventory = () => call(() => localDb.inventory.listPending());

export const deliverInventoryItem = (payload) =>
  call(() => localDb.inventory.deliver(payload));
