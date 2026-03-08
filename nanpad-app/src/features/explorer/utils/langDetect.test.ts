/**
 * Tests unitarios para detección de lenguaje y mapeo extensión.
 */

import { describe, it, expect } from "vitest";
import { detectLanguage, languageToExt } from "./langDetect";

describe("detectLanguage", () => {
  it("retorna plaintext si la extensión está vacía o no se reconoce", () => {
    expect(detectLanguage()).toBe("plaintext");
    expect(detectLanguage("")).toBe("plaintext");
    expect(detectLanguage("xyz")).toBe("plaintext");
  });

  it("mapea extensiones de TypeScript/JavaScript", () => {
    expect(detectLanguage("ts")).toBe("typescript");
    expect(detectLanguage("tsx")).toBe("typescriptreact");
    expect(detectLanguage("js")).toBe("javascript");
    expect(detectLanguage("jsx")).toBe("javascriptreact");
  });

  it("mapea extensiones de Markdown y texto", () => {
    expect(detectLanguage("md")).toBe("markdown");
    expect(detectLanguage("mdx")).toBe("markdown");
    expect(detectLanguage("txt")).toBe("plaintext");
  });

  it("mapea extensiones de datos y config", () => {
    expect(detectLanguage("json")).toBe("json");
    expect(detectLanguage("yaml")).toBe("yaml");
    expect(detectLanguage("yml")).toBe("yaml");
  });

  it("normaliza a minúsculas", () => {
    expect(detectLanguage("TS")).toBe("typescript");
    expect(detectLanguage("MD")).toBe("markdown");
  });
});

describe("languageToExt", () => {
  it("retorna la extensión para un lenguaje conocido", () => {
    expect(languageToExt("markdown")).toBe("md");
    expect(languageToExt("typescript")).toBe("ts");
    expect(languageToExt("typescriptreact")).toBe("tsx");
    expect(languageToExt("javascript")).toBe("js");
    expect(languageToExt("plaintext")).toBe("txt");
  });

  it("retorna txt para lenguaje no reconocido", () => {
    expect(languageToExt("unknown")).toBe("txt");
  });
});
