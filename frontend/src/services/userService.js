import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getUsers = () => call(() => localDb.users.list());

export const createUser = (payload) => call(() => localDb.users.create(payload));

export const updateUser = (userId, payload) =>
  call(() => localDb.users.update(userId, payload));

export const deleteUser = (userId) => call(() => localDb.users.remove(userId));

export const changePassword = (userId, newPassword) =>
  call(() => localDb.users.changePassword(userId, newPassword));
