import fs from "node:fs";
import path from "node:path";
import { AppError } from "../errors.js";

export function assertValidDirectory(directory: string): void {
  if (!directory.trim()) {
    throw new AppError(400, "A pasta informada não foi encontrada.", "DIRECTORY_MISSING");
  }

  if (!path.isAbsolute(directory)) {
    throw new AppError(
      400,
      "Informe o caminho absoluto da pasta do projeto.",
      "DIRECTORY_NOT_ABSOLUTE",
    );
  }

  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new AppError(400, "A pasta informada não foi encontrada.", "DIRECTORY_MISSING");
  }
}

export function validateDirectory(directory: string): { valid: boolean; message?: string } {
  try {
    assertValidDirectory(directory);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : "Diretório inválido.",
    };
  }
}
