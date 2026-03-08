/**
 * Tests unitarios para validación de nombres de archivo y rutas.
 */

import { describe, it, expect } from "vitest";
import { validateFileNameOrPath, validateSingleName } from "./validateFileName";

describe("validateFileNameOrPath", () => {
  it("retorna válido para un nombre simple correcto", () => {
    const result = validateFileNameOrPath("mi-archivo.md", false);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("retorna válido para una ruta con segmentos", () => {
    const result = validateFileNameOrPath("carpeta/subcarpeta/archivo.txt", false);
    expect(result.valid).toBe(true);
  });

  it("retorna error si el nombre está vacío", () => {
    const result = validateFileNameOrPath("", false);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("El nombre no puede estar vacío.");
  });

  it("retorna error si el nombre es solo espacios", () => {
    const result = validateFileNameOrPath("   ", false);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("El nombre no puede estar vacío.");
  });

  it("retorna error para el segmento '.'", () => {
    const result = validateFileNameOrPath(".", false);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Nombre no permitido: "."');
  });

  it("retorna error para el segmento '..'", () => {
    const result = validateFileNameOrPath("..", false);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Nombre no permitido: ".."');
  });

  it("retorna error si un segmento contiene caracteres prohibidos", () => {
    // "/" en medio crea segmentos válidos (ej. "m/n" → ["m","n"]), por eso no se incluye.
    const invalid = ["archivo*nombre", "test:file", "a<b", "c>d", "e?f", 'g"h', "i|j", "k\\l"];
    for (const name of invalid) {
      const result = validateFileNameOrPath(name, false);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    }
  });

  it("recorta espacios al inicio y final del input", () => {
    const result = validateFileNameOrPath("  archivo  ", false);
    expect(result.valid).toBe(true);
  });
});

describe("validateSingleName", () => {
  it("retorna válido para un nombre simple", () => {
    const result = validateSingleName("documento");
    expect(result.valid).toBe(true);
  });

  it("retorna error si está vacío", () => {
    const result = validateSingleName("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("El nombre no puede estar vacío.");
  });

  it("retorna error si contiene /", () => {
    const result = validateSingleName("carpeta/archivo");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("/ ni \\");
  });

  it("retorna error si contiene \\", () => {
    const result = validateSingleName("ruta\\archivo");
    expect(result.valid).toBe(false);
  });

  it("retorna error para '.'", () => {
    const result = validateSingleName(".");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Nombre no permitido: "."');
  });

  it("retorna error para '..'", () => {
    const result = validateSingleName("..");
    expect(result.valid).toBe(false);
  });

  it("retorna error para caracteres no permitidos", () => {
    expect(validateSingleName("a*b").valid).toBe(false);
    expect(validateSingleName("a:b").valid).toBe(false);
    expect(validateSingleName('a"b').valid).toBe(false);
  });

  it("acepta nombre con espacios al inicio o final porque la implementación hace trim", () => {
    expect(validateSingleName(" nombre").valid).toBe(true);
    expect(validateSingleName("nombre ").valid).toBe(true);
  });
});
