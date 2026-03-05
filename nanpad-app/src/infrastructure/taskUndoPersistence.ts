/**
 * Persistencia de las pilas undo/redo de tareas en SQLite (tabla task_undo_session).
 * Tope de 5 pasos; se guarda el estado anterior de cada tarea modificada.
 */

import type { IDatabase } from "@nanpad/core";
import type { TaskDTO } from "@nanpad/core";

const ROW_ID = 1;

/** Resultado de cargar la sesión de undo de tareas. */
export interface TaskUndoSession {
  undo: TaskDTO[];
  redo: TaskDTO[];
}

/**
 * Valida que un valor sea un TaskDTO (comprobación mínima para no persistir basura).
 */
function isTaskDTO(x: unknown): x is TaskDTO {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.status === "string" &&
    Array.isArray(o.categoryIds) &&
    Array.isArray(o.tagIds) &&
    Array.isArray(o.subtasks)
  );
}

/**
 * Carga las pilas undo/redo de tareas desde la base de datos.
 * @param db - Conexión SQLite ya migrada.
 */
export async function loadTaskUndoSessionFromDb(
  db: IDatabase
): Promise<TaskUndoSession> {
  const rows = await db.select<
    { undo_stack: string; redo_stack: string }[]
  >(
    "SELECT undo_stack, redo_stack FROM task_undo_session WHERE id = ?",
    [ROW_ID]
  );
  const row = rows[0];
  if (!row) return { undo: [], redo: [] };
  try {
    const undoRaw = JSON.parse(row.undo_stack) as unknown;
    const redoRaw = JSON.parse(row.redo_stack) as unknown;
    const undo = Array.isArray(undoRaw)
      ? undoRaw.filter(isTaskDTO)
      : [];
    const redo = Array.isArray(redoRaw)
      ? redoRaw.filter(isTaskDTO)
      : [];
    return { undo, redo };
  } catch {
    return { undo: [], redo: [] };
  }
}

/**
 * Guarda las pilas undo/redo de tareas en la base de datos.
 * @param db - Conexión SQLite.
 * @param session - Pilas a persistir (máx. 5 en cada una; el store ya aplica el tope).
 */
export async function saveTaskUndoSessionToDb(
  db: IDatabase,
  session: TaskUndoSession
): Promise<void> {
  const undoJson = JSON.stringify(session.undo);
  const redoJson = JSON.stringify(session.redo);
  await db.execute(
    `INSERT INTO task_undo_session (id, undo_stack, redo_stack, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       undo_stack = excluded.undo_stack,
       redo_stack = excluded.redo_stack,
       updated_at = excluded.updated_at`,
    [ROW_ID, undoJson, redoJson]
  );
}
