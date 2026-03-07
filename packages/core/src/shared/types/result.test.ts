/**
 * Tests del tipo Result (ok/err y type guards).
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "./result";

describe("result", () => {
  describe("ok", () => {
    it("retorna un objeto con success true y data", () => {
      const r = ok(42);
      expect(r.success).toBe(true);
      expect("data" in r && r.data).toBe(42);
    });

    it("permite cualquier tipo de data", () => {
      expect(ok("hello").data).toBe("hello");
      expect(ok({ id: "1" }).data).toEqual({ id: "1" });
      expect(ok(null).data).toBeNull();
    });
  });

  describe("err", () => {
    it("retorna un objeto con success false y error", () => {
      const r = err("fallo");
      expect(r.success).toBe(false);
      expect("error" in r && r.error).toBe("fallo");
    });

    it("permite error de tipo string por defecto", () => {
      expect(err("mensaje").error).toBe("mensaje");
    });

    it("permite error de otro tipo genérico", () => {
      const r = err({ code: 404 });
      expect(r.error).toEqual({ code: 404 });
    });
  });

  describe("type guards", () => {
    it("Ok tiene success === true", () => {
      const r = ok(1);
      if (r.success) {
        expect(r.data).toBe(1);
      } else {
        expect.fail("debería ser Ok");
      }
    });

    it("Err tiene success === false", () => {
      const r = err("x");
      if (!r.success) {
        expect(r.error).toBe("x");
      } else {
        expect.fail("debería ser Err");
      }
    });
  });
});
