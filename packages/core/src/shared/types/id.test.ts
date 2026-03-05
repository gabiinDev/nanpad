import { describe, it, expect } from "vitest";
import { generateId, isValidId } from "./id.ts";

describe("generateId", () => {
  it("genera un string no vacío", () => {
    expect(generateId()).toBeTruthy();
  });

  it("genera IDs únicos en cada llamada", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("genera un UUID v4 válido", () => {
    const id = generateId();
    expect(isValidId(id)).toBe(true);
  });
});

describe("isValidId", () => {
  it("devuelve true para UUIDs v4 válidos", () => {
    expect(isValidId("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
    expect(isValidId("550e8400-e29b-41d4-a716-446655440000")).toBe(true); // v4: tercer bloque empieza en 4
  });

  it("devuelve false para un UUID sin formato v4 (variante incorrecta)", () => {
    // El tercer bloque no empieza en '4'
    expect(isValidId("550e8400-e29b-31d4-a716-446655440000")).toBe(false);
  });

  it("devuelve false para strings que no son UUID", () => {
    expect(isValidId("not-a-uuid")).toBe(false);
    expect(isValidId("")).toBe(false);
    expect(isValidId(null)).toBe(false);
    expect(isValidId(undefined)).toBe(false);
    expect(isValidId(123)).toBe(false);
  });
});
