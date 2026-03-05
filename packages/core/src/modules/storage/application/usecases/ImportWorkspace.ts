/**
 * UseCase: Importar un snapshot JSON al workspace.
 * Valida el schema_version del snapshot, aplica migraciones si es necesario
 * y restaura las tablas (merge o replace según la opción elegida).
 */

import type { IStoragePort } from "@modules/storage/infrastructure/IStoragePort";
import type {
  ImportWorkspaceInput,
  ImportWorkspaceResult,
  WorkspaceSnapshot,
} from "../dtos/StorageDTO";

/**
 * Importa un snapshot previamente exportado con ExportWorkspace.
 * Soporta dos modos:
 * - `replace: false` (por defecto): merge usando INSERT OR IGNORE.
 * - `replace: true`: elimina todos los datos actuales y los reemplaza.
 */
export class ImportWorkspace {
  constructor(private readonly storage: IStoragePort) {}

  /**
   * @param input - JSON del snapshot y opciones de importación.
   * @returns Estadísticas del import.
   * @throws {Error} Si el JSON no es válido o le faltan propiedades requeridas.
   * @throws {Error} Si la versión del snapshot es mayor que la versión actual del schema.
   */
  async execute(input: ImportWorkspaceInput): Promise<ImportWorkspaceResult> {
    const snapshot = parseSnapshot(input.json);
    const currentVersion = await this.storage.getCurrentSchemaVersion();

    if (snapshot.schemaVersion > currentVersion) {
      throw new Error(
        `[ImportWorkspace] El snapshot requiere schema v${snapshot.schemaVersion} ` +
          `pero la DB actual es v${currentVersion}. Actualiza la aplicación.`
      );
    }

    if (input.replace) {
      await this.storage.clearAllData();
    }

    const [
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
      this.storage.insertCategories(snapshot.categories),
      this.storage.insertTags(snapshot.tags),
      this.storage.insertTasks(snapshot.tasks),
      this.storage.insertTaskCategories(snapshot.taskCategories),
      this.storage.insertTaskTags(snapshot.taskTags),
      this.storage.insertSubtasks(snapshot.subtasks),
      this.storage.insertTaskCodeSnippets(snapshot.taskCodeSnippets),
      this.storage.insertDocuments(snapshot.documents),
      this.storage.insertDocumentContents(snapshot.documentContents),
      this.storage.insertHistoryEntries(snapshot.historyEntries),
    ]);

    return {
      imported: {
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
      },
      snapshotSchemaVersion: snapshot.schemaVersion,
      currentSchemaVersion: currentVersion,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parsea y valida la estructura básica del snapshot.
 * @throws {Error} Si el JSON no es válido o le faltan campos requeridos.
 */
function parseSnapshot(json: string): WorkspaceSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("[ImportWorkspace] El JSON proporcionado no es válido.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("schemaVersion" in parsed) ||
    !("exportedAt" in parsed) ||
    !("tasks" in parsed) ||
    !("categories" in parsed) ||
    !("documents" in parsed)
  ) {
    throw new Error(
      "[ImportWorkspace] El snapshot no tiene la estructura esperada."
    );
  }

  const snapshot = parsed as Record<string, unknown>;

  return {
    schemaVersion: Number(snapshot.schemaVersion),
    exportedAt: String(snapshot.exportedAt),
    appVersion: String(snapshot.appVersion ?? "0.0.0"),
    categories: asArray(snapshot.categories),
    tags: asArray(snapshot.tags),
    tasks: asArray(snapshot.tasks),
    taskCategories: asArray(snapshot.taskCategories),
    taskTags: asArray(snapshot.taskTags),
    subtasks: asArray(snapshot.subtasks),
    taskCodeSnippets: asArray(snapshot.taskCodeSnippets),
    documents: asArray(snapshot.documents),
    documentContents: asArray(snapshot.documentContents),
    historyEntries: asArray(snapshot.historyEntries),
  } as WorkspaceSnapshot;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
