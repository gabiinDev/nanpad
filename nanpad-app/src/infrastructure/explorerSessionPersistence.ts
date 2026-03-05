/**
 * Persistencia de la sesión del explorador de archivos en SQLite.
 * Almacena solo paths de tabs reales fijados y el tab activo (sin contenido).
 *
 * La limpieza de paths inválidos (archivos que ya no existen) es implícita:
 * siempre se persiste el estado actual de openTabs; los que no se pudieron
 * restaurar no están en ese estado, así que no se vuelven a guardar.
 */

import type { IDatabase } from "@nanpad/core";
import type { ClosedTabInfo } from "@/store/useExplorerStore.ts";

/** Sesión persistida: paths de tabs reales, tab activo, modos .md y pila de cerrados. */
export interface PersistedExplorerSession {
  realTabIds: string[];
  activeTabId: string | null;
  mdViewModes?: Record<string, { mode: string; splitRatio: number }>;
  closedTabsStack?: ClosedTabInfo[];
}

const ROW_ID = 1;

/**
 * Carga la sesión del explorador desde la base de datos.
 * @param db - Conexión SQLite ya migrada.
 * @returns Sesión o null si no hay fila o es inválida.
 */
export async function loadExplorerSessionFromDb(
  db: IDatabase
): Promise<PersistedExplorerSession | null> {
  const rows = await db.select<
    {
      real_tab_ids: string;
      active_tab_id: string | null;
      md_view_modes?: string | null;
      closed_tabs_stack?: string | null;
    }[]
  >(
    "SELECT real_tab_ids, active_tab_id, md_view_modes, closed_tabs_stack FROM explorer_session WHERE id = ?",
    [ROW_ID]
  );
  const row = rows[0];
  if (!row) return null;
  try {
    const realTabIds = JSON.parse(row.real_tab_ids) as unknown;
    if (!Array.isArray(realTabIds)) return null;
    const ids = realTabIds.filter((id): id is string => typeof id === "string");
    const activeTabId =
      row.active_tab_id != null && row.active_tab_id !== ""
        ? row.active_tab_id
        : null;
    let mdViewModes: PersistedExplorerSession["mdViewModes"];
    if (row.md_view_modes != null && row.md_view_modes !== "") {
      try {
        const parsed = JSON.parse(row.md_view_modes) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          mdViewModes = parsed as Record<string, { mode: string; splitRatio: number }>;
        }
      } catch {
        // ignorar
      }
    }
    let closedTabsStack: ClosedTabInfo[] | undefined;
    if (row.closed_tabs_stack != null && row.closed_tabs_stack !== "") {
      try {
        const parsed = JSON.parse(row.closed_tabs_stack) as unknown;
        if (Array.isArray(parsed)) {
          closedTabsStack = parsed.filter(
            (x): x is ClosedTabInfo =>
              x != null &&
              typeof x === "object" &&
              typeof (x as ClosedTabInfo).id === "string" &&
              typeof (x as ClosedTabInfo).label === "string" &&
              typeof (x as ClosedTabInfo).content === "string" &&
              typeof (x as ClosedTabInfo).isTemp === "boolean"
          );
        }
      } catch {
        // ignorar
      }
    }
    return { realTabIds: ids, activeTabId, mdViewModes, closedTabsStack };
  } catch {
    return null;
  }
}

/**
 * Guarda la sesión del explorador en la base de datos.
 * @param db - Conexión SQLite.
 * @param session - Sesión a persistir.
 */
export async function saveExplorerSessionToDb(
  db: IDatabase,
  session: PersistedExplorerSession
): Promise<void> {
  const realTabIdsJson = JSON.stringify(session.realTabIds);
  const activeTabId = session.activeTabId ?? null;
  const mdViewModesJson = JSON.stringify(session.mdViewModes ?? {});
  const closedTabsStackJson = JSON.stringify(session.closedTabsStack ?? []);
  await db.execute(
    `INSERT INTO explorer_session (id, real_tab_ids, active_tab_id, md_view_modes, closed_tabs_stack, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       real_tab_ids = excluded.real_tab_ids,
       active_tab_id = excluded.active_tab_id,
       md_view_modes = excluded.md_view_modes,
       closed_tabs_stack = excluded.closed_tabs_stack,
       updated_at = excluded.updated_at`,
    [ROW_ID, realTabIdsJson, activeTabId, mdViewModesJson, closedTabsStackJson]
  );
}
