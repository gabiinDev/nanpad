/**
 * Tests de los UseCases del módulo Settings.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetAppSettings } from "../GetAppSettings";
import { SaveAppSetting } from "../SaveAppSetting";
import { InMemoryAppSettingsRepository } from "./fakes";

describe("GetAppSettings", () => {
  let repo: InMemoryAppSettingsRepository;
  let getAppSettings: GetAppSettings;

  beforeEach(() => {
    repo = new InMemoryAppSettingsRepository();
    getAppSettings = new GetAppSettings(repo);
  });

  it("retorna valores por defecto cuando no hay nada guardado", async () => {
    const result = await getAppSettings.execute();
    expect(result.theme).toBe("dark");
    expect(result.high_performance).toBe(false);
    expect(result.default_task_view).toBe("kanban");
    expect(result.show_help_icon).toBe(true);
  });

  it("retorna valores guardados cuando existen", async () => {
    await repo.set("theme", "light");
    await repo.set("high_performance", "true");
    const result = await getAppSettings.execute();
    expect(result.theme).toBe("light");
    expect(result.high_performance).toBe(true);
  });
});

describe("SaveAppSetting", () => {
  let repo: InMemoryAppSettingsRepository;
  let saveAppSetting: SaveAppSetting;

  beforeEach(() => {
    repo = new InMemoryAppSettingsRepository();
    saveAppSetting = new SaveAppSetting(repo);
  });

  it("guarda un valor string", async () => {
    await saveAppSetting.execute({ key: "theme", value: "light" });
    const all = await repo.getAll();
    expect(all.theme).toBe("light");
  });

  it("guarda un valor boolean como string", async () => {
    await saveAppSetting.execute({ key: "show_help_icon", value: false });
    const all = await repo.getAll();
    expect(all.show_help_icon).toBe("false");
  });
});
