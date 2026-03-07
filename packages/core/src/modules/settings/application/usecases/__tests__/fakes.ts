/**
 * Fake del repositorio de preferencias para tests.
 */

import type { IAppSettingsRepository } from "../../../infrastructure/persistence/AppSettingsRepository";

export class InMemoryAppSettingsRepository implements IAppSettingsRepository {
  private data = new Map<string, string>();

  async getAll(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    this.data.forEach((v, k) => { out[k] = v; });
    return out;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }
}
