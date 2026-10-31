import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getStocks = () => call(() => localDb.stocks.list());

export const addOrUpdateStock = (stockData) =>
  call(() => localDb.stocks.addOrUpdate(stockData));

export const updateStockQuantity = (stockId, payload) =>
  call(() => localDb.stocks.updateQuantity(stockId, payload));
