/**
 * Tests unitarios del value object Priority.
 */

import { describe, it, expect } from "vitest";
import { Priority, PRIORITY_LABELS } from "./Priority";

describe("Priority", () => {
  describe("from", () => {
    it("crea Priority desde valores válidos 0-3", () => {
      expect(Priority.from(0).value).toBe(0);
      expect(Priority.from(1).value).toBe(1);
      expect(Priority.from(2).value).toBe(2);
      expect(Priority.from(3).value).toBe(3);
    });

    it("lanza error para valor inválido", () => {
      expect(() => Priority.from(4)).toThrow("[Priority]");
      expect(() => Priority.from(-1)).toThrow("[Priority]");
      expect(() => Priority.from(99)).toThrow("[Priority]");
    });
  });

  describe("constantes estáticas", () => {
    it("LOW, MEDIUM, HIGH, CRITICAL tienen los valores correctos", () => {
      expect(Priority.LOW.value).toBe(0);
      expect(Priority.MEDIUM.value).toBe(1);
      expect(Priority.HIGH.value).toBe(2);
      expect(Priority.CRITICAL.value).toBe(3);
    });

    it("coinciden con PRIORITY_LABELS", () => {
      expect(PRIORITY_LABELS[0]).toBe("low");
      expect(PRIORITY_LABELS[1]).toBe("medium");
      expect(PRIORITY_LABELS[2]).toBe("high");
      expect(PRIORITY_LABELS[3]).toBe("critical");
    });
  });

  describe("label", () => {
    it("devuelve la etiqueta legible", () => {
      expect(Priority.LOW.label).toBe("low");
      expect(Priority.MEDIUM.label).toBe("medium");
      expect(Priority.HIGH.label).toBe("high");
      expect(Priority.CRITICAL.label).toBe("critical");
    });
  });

  describe("equals", () => {
    it("retorna true para la misma prioridad", () => {
      expect(Priority.LOW.equals(Priority.from(0))).toBe(true);
      expect(Priority.HIGH.equals(Priority.from(2))).toBe(true);
    });

    it("retorna false para prioridades distintas", () => {
      expect(Priority.LOW.equals(Priority.HIGH)).toBe(false);
      expect(Priority.MEDIUM.equals(Priority.CRITICAL)).toBe(false);
    });
  });

  describe("toString", () => {
    it("retorna el label", () => {
      expect(Priority.LOW.toString()).toBe("low");
      expect(Priority.CRITICAL.toString()).toBe("critical");
    });
  });
});
