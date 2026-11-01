import api from "../utils/api.js";
import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getUsers = () =>
  call(
    async () => {
      const { data } = await api.get("/users");
      return Array.isArray(data) ? data : [];
    },
    () => localDb.users.list(),
  );

export const createUser = (payload) =>
  call(
    async () => {
      const { data } = await api.post("/users", payload);
      return data;
    },
    () => localDb.users.create(payload),
  );

export const updateUser = (userId, payload) =>
  call(
    async () => {
      const { data } = await api.put(`/users/${userId}`, payload);
      return data;
    },
    () => localDb.users.update(userId, payload),
  );

export const deleteUser = (userId) =>
  call(
    async () => {
      const { data } = await api.delete(`/users/${userId}`);
      return data;
    },
    () => localDb.users.remove(userId),
  );

export const changePassword = (userId, newPassword) =>
  call(
    async () => {
      const { data } = await api.patch(`/users/${userId}/password`, {
        password: newPassword,
      });
      return data;
    },
    () => localDb.users.changePassword(userId, newPassword),
  );
