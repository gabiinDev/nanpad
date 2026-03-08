/**
 * Tests del router minimalista de la app.
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_ROUTE, type AppRoute } from "./router";

describe("router", () => {
  it("DEFAULT_ROUTE es home", () => {
    expect(DEFAULT_ROUTE).toBe("home");
  });

  it("AppRoute incluye las rutas esperadas", () => {
    const routes: AppRoute[] = ["home", "tasks", "documents", "settings"];
    expect(routes).toHaveLength(4);
    expect(routes).toContain("home");
    expect(routes).toContain("tasks");
    expect(routes).toContain("documents");
    expect(routes).toContain("settings");
  });
});
