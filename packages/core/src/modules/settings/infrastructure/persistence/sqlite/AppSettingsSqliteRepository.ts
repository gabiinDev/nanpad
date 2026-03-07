/**
 * Implementación del repositorio de preferencias sobre SQLite (tabla app_settings).
 */

import type { IDatabase } from "@infra/db/IDatabase";
import type { IAppSettingsRepository } from "../AppSettingsRepository";

const KEYS = [
  "theme",
  "high_performance",
  "default_task_view",
  "show_help_icon",
  "mcp_enabled",
  "mcp_port",
] as const;

export class AppSettingsSqliteRepository implements IAppSettingsRepository {
  constructor(private readonly db: IDatabase) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.select<{ key: string; value: string }[]>(
      "SELECT key, value FROM app_settings WHERE key IN ($1, $2, $3, $4, $5, $6)",
      [...KEYS]
    );
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return map;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
  }
}
