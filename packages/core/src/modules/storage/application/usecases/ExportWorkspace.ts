/**
 * UseCase: Exportar el workspace completo como snapshot JSON.
 * Lee todas las tablas y las serializa en un único objeto WorkspaceSnapshot.
 */

import type { IStoragePort } from "@modules/storage/infrastructure/IStoragePort.ts";
import type {
  ExportWorkspaceInput,
  ExportWorkspaceResult,
  WorkspaceSnapshot,
} from "../dtos/StorageDTO.ts";

/** Versión de la aplicación incluida en cada snapshot. */
const APP_VERSION = "0.1.0";

/**
 * Serializa el estado completo del workspace a JSON.
 * El JSON resultante puede usarse para backup o para importar en otro dispositivo.
 */
export class ExportWorkspace {
  constructor(private readonly storage: IStoragePort) {}

  /**
   * @param input - Opciones de exportación.
   * @returns JSON del snapshot + metadata del archivo.
   */
  async execute(
    input: ExportWorkspaceInput = {}
  ): Promise<ExportWorkspaceResult> {
    const includeHistory = input.includeHistory ?? true;

    const [
      schemaVersion,
      categories,
      tags,
      tasks,
      taskCategories,
      taskTags,
      subtasks,
      taskCodeSnippets,
      documents,
      documentContents,
      historyEntries,
    ] = await Promise.all([
      this.storage.getCurrentSchemaVersion(),
      this.storage.readCategories(),
      this.storage.readTags(),
      this.storage.readTasks(),
      this.storage.readTaskCategories(),
      this.storage.readTaskTags(),
      this.storage.readSubtasks(),
      this.storage.readTaskCodeSnippets(),
      this.storage.readDocuments(),
      this.storage.readDocumentContents(),
      includeHistory
        ? this.storage.readHistoryEntries()
        : Promise.resolve([]),
    ]);

    const exportedAt = new Date().toISOString();

    const snapshot: WorkspaceSnapshot = {
      schemaVersion,
      exportedAt,
      appVersion: APP_VERSION,
      categories,
      tags,
      tasks,
      taskCategories,
      taskTags,
      subtasks,
      taskCodeSnippets,
      documents,
      documentContents,
      historyEntries,
    };

    const json = JSON.stringify(snapshot, null, 2);
    const date = exportedAt.slice(0, 10); // YYYY-MM-DD
    const filename = `nanpad-backup-${date}.json`;

    return {
      json,
      filename,
      sizeBytes: new TextEncoder().encode(json).length,
    };
  }
}
