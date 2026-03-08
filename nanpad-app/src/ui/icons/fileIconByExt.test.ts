/**
 * Tests de los helpers de extensión de archivo (código, previsualizable, editable).
 */

import { describe, it, expect } from "vitest";
import {
  isCodeExt,
  isPreviewableExt,
  canOpenInCode,
  isNonEditableExt,
} from "./fileIconByExt";

describe("isCodeExt", () => {
  it("retorna true para extensiones de código", () => {
    expect(isCodeExt("ts")).toBe(true);
    expect(isCodeExt("tsx")).toBe(true);
    expect(isCodeExt("js")).toBe(true);
    expect(isCodeExt("py")).toBe(true);
    expect(isCodeExt("json")).toBe(true);
  });

  it("retorna false para markdown y otros no código", () => {
    expect(isCodeExt("md")).toBe(false);
    expect(isCodeExt("pdf")).toBe(false);
  });

  it("normaliza extensión con punto y mayúsculas", () => {
    expect(isCodeExt(".TS")).toBe(true);
  });
});

describe("isPreviewableExt", () => {
  it("retorna true para markdown", () => {
    expect(isPreviewableExt("md")).toBe(true);
    expect(isPreviewableExt("mdx")).toBe(true);
    expect(isPreviewableExt("mdc")).toBe(true);
  });

  it("retorna false para no markdown", () => {
    expect(isPreviewableExt("txt")).toBe(false);
    expect(isPreviewableExt("ts")).toBe(false);
  });
});

describe("canOpenInCode", () => {
  it("retorna true si es código o markdown", () => {
    expect(canOpenInCode("ts")).toBe(true);
    expect(canOpenInCode("md")).toBe(true);
  });

  it("retorna false para pdf, zip, etc.", () => {
    expect(canOpenInCode("pdf")).toBe(false);
    expect(canOpenInCode("zip")).toBe(false);
  });
});

describe("isNonEditableExt", () => {
  it("retorna true para zip, exe, pdf, imagen, audio, video", () => {
    expect(isNonEditableExt("zip")).toBe(true);
    expect(isNonEditableExt("pdf")).toBe(true);
    expect(isNonEditableExt("png")).toBe(true);
    expect(isNonEditableExt("mp3")).toBe(true);
    expect(isNonEditableExt("mp4")).toBe(true);
  });

  it("retorna false para ts, md, json", () => {
    expect(isNonEditableExt("ts")).toBe(false);
    expect(isNonEditableExt("md")).toBe(false);
    expect(isNonEditableExt("json")).toBe(false);
  });
});
