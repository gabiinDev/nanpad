/**
 * UseCase: Crear un punto de restauración manual del workspace.
 * Delega en ExportWorkspace y añade metadata adicional para identificar el backup.
 */

import type { IStoragePort } from "@modules/storage/infrastructure/IStoragePort.ts";
import { ExportWorkspace } from "./ExportWorkspace.ts";
import type { BackupResult } from "../dtos/StorageDTO.ts";

/**
 * Genera un snapshot completo del workspace (incluido historial).
 * Retorna el JSON listo para guardar en disco o transferir.
 */
export class BackupNow {
  private readonly exportWorkspace: ExportWorkspace;

  constructor(storage: IStoragePort) {
    this.exportWorkspace = new ExportWorkspace(storage);
  }

  /**
   * @returns BackupResult con el JSON del snapshot y metadata del archivo.
   */
  async execute(): Promise<BackupResult> {
    const result = await this.exportWorkspace.execute({ includeHistory: true });
    const createdAt = new Date().toISOString();

    return {
      json: result.json,
      createdAt,
      filename: result.filename,
    };
  }
}
