/**
 * Setup global para tests de Vitest del paquete @nanpad/app.
 * Mockea las APIs nativas de Tauri que no están disponibles en entorno jsdom.
 */

import { vi } from "vitest";

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn().mockResolvedValue({
      execute: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
      select: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/app/data"),
  join: vi.fn((...parts: string[]) => Promise.resolve(parts.join("/"))),
}));
