/**
 * Tests de los helpers de extensión de archivo (código, previsualizable, editable).
 */

import { describe, it, expect } from "vitest";
import {
  isCodeExt,
  isPreviewableExt,
  isPdfPreviewExt,
  isImagePreviewExt,
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

describe("isPdfPreviewExt", () => {
  it("retorna true para pdf", () => {
    expect(isPdfPreviewExt("pdf")).toBe(true);
    expect(isPdfPreviewExt(".PDF")).toBe(true);
  });

  it("retorna false para otros formatos", () => {
    expect(isPdfPreviewExt("md")).toBe(false);
    expect(isPdfPreviewExt("zip")).toBe(false);
  });
});

describe("isImagePreviewExt", () => {
  it("retorna true para png, jpg, jpeg, gif, webp, tiff, tif", () => {
    expect(isImagePreviewExt("png")).toBe(true);
    expect(isImagePreviewExt("jpg")).toBe(true);
    expect(isImagePreviewExt("jpeg")).toBe(true);
    expect(isImagePreviewExt("gif")).toBe(true);
    expect(isImagePreviewExt("webp")).toBe(true);
    expect(isImagePreviewExt("tiff")).toBe(true);
    expect(isImagePreviewExt("tif")).toBe(true);
  });

  it("retorna false para otros formatos", () => {
    expect(isImagePreviewExt("pdf")).toBe(false);
    expect(isImagePreviewExt("md")).toBe(false);
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
