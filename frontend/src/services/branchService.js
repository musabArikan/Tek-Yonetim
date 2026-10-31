import { localDb } from "../utils/localDb.js";
import { call } from "./serviceUtils.js";

export const getBranches = () => call(() => localDb.branches.list());

export const createBranch = (branchData) =>
  call(() => localDb.branches.create(branchData));

export const updateBranch = (branchId, branchData) =>
  call(() => localDb.branches.update(branchId, branchData));

export const deleteBranch = (branchId) =>
  call(() => localDb.branches.remove(branchId));
