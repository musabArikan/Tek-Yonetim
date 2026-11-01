import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getStocks = () =>
  call(
    async () => {
      const { data } = await api.get("/stocks");
      return Array.isArray(data) ? data : [];
    },
    () => localDb.stocks.list(),
  );

export const addOrUpdateStock = (stockData) =>
  call(
    async () => {
      const { data } = await api.post("/stocks", stockData);
      return data;
    },
    () => localDb.stocks.addOrUpdate(stockData),
  );

export const updateStockQuantity = (stockId, payload) =>
  call(
    async () => {
      const { data } = await api.patch(`/stocks/${stockId}/quantity`, payload);
      return data;
    },
    () => localDb.stocks.updateQuantity(stockId, payload),
  );
