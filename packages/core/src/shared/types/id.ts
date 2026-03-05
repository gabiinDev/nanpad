/**
 * Tipos y utilidades para identificadores únicos del sistema.
 * Todos los IDs son UUIDs v4 en formato string.
 */

import { v4 as uuidv4 } from "uuid";

/** Tipo nominal para IDs de entidades. Siempre UUID v4 como string. */
export type EntityId = string;

/**
 * Genera un nuevo UUID v4.
 * @returns UUID v4 como string.
 */
export function generateId(): EntityId {
  return uuidv4();
}

/**
 * Verifica si un string tiene formato de UUID v4.
 * @param value - Valor a validar.
 * @returns true si es un UUID v4 válido.
 */
export function isValidId(value: unknown): value is EntityId {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
