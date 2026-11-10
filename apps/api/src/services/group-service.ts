import { z } from "zod";
import type { Group } from "@devdesk/shared";
import { AppError } from "../errors.js";
import * as groupRepo from "../db/groups.js";

export const groupInputSchema = z.object({
  name: z.string().trim().min(1, "O nome do grupo não pode estar vazio."),
});

export function listGroups(): Group[] {
  return groupRepo.listGroups();
}

export function getGroupOrThrow(id: number): Group {
  const group = groupRepo.getGroup(id);
  if (!group) {
    throw new AppError(404, "Grupo não encontrado.", "NOT_FOUND");
  }
  return group;
}

export function createGroup(name: string): Group {
  try {
    return groupRepo.createGroup(name.trim());
  } catch (error) {
    if (isUniqueError(error)) {
      throw new AppError(409, "Já existe um grupo com este nome.", "GROUP_EXISTS");
    }
    throw error;
  }
}

export function updateGroup(id: number, name: string): Group {
  getGroupOrThrow(id);
  try {
    return groupRepo.updateGroup(id, name.trim());
  } catch (error) {
    if (isUniqueError(error)) {
      throw new AppError(409, "Já existe um grupo com este nome.", "GROUP_EXISTS");
    }
    throw error;
  }
}

export function removeGroup(id: number): void {
  getGroupOrThrow(id);
  groupRepo.deleteGroup(id);
}

function isUniqueError(error: unknown): boolean {
  return error instanceof Error && /unique/i.test(error.message);
}
