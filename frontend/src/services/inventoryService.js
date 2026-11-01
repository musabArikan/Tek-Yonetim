import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getPendingInventory = () =>
  call(
    async () => {
      const { data } = await api.get("/inventory/pending");
      return Array.isArray(data) ? data : [];
    },
    () => localDb.inventory.listPending(),
  );

export const deliverInventoryItem = (payload) =>
  call(
    async () => {
      const { data } = await api.post("/inventory/deliver", payload);
      return data;
    },
    () => localDb.inventory.deliver(payload),
  );
