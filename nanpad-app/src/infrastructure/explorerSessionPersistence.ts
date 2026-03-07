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

/** Sesión persistida: paths de tabs reales, tab activo, modos .md, pila cerrados, favoritos, panel favoritos y lenguajes. */
export interface PersistedExplorerSession {
  realTabIds: string[];
  activeTabId: string | null;
  mdViewModes?: Record<string, { mode: string; splitRatio: number }>;
  closedTabsStack?: ClosedTabInfo[];
  /** Rutas absolutas de carpetas favoritas para acceso rápido. */
  favoriteFolders?: string[];
  /** Si el panel de favoritos está expandido (true) o colapsado (false). */
  favoritesPanelExpanded?: boolean;
  /** Override de lenguaje por tabId (notas temporales y archivos). */
  tempLanguageOverrides?: Record<string, string>;
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
      favorite_folders?: string | null;
      favorites_panel_expanded?: number | null;
      temp_language_overrides?: string | null;
    }[]
  >(
    "SELECT real_tab_ids, active_tab_id, md_view_modes, closed_tabs_stack, favorite_folders, favorites_panel_expanded, temp_language_overrides FROM explorer_session WHERE id = ?",
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
    let favoriteFolders: string[] | undefined;
    if (row.favorite_folders != null && row.favorite_folders !== "") {
      try {
        const parsed = JSON.parse(row.favorite_folders) as unknown;
        if (Array.isArray(parsed)) {
          favoriteFolders = parsed.filter((x): x is string => typeof x === "string");
        }
      } catch {
        // ignorar
      }
    }
    const favoritesPanelExpanded =
      row.favorites_panel_expanded != null
        ? row.favorites_panel_expanded !== 0
        : undefined;
    let tempLanguageOverrides: Record<string, string> | undefined;
    if (row.temp_language_overrides != null && row.temp_language_overrides !== "") {
      try {
        const parsed = JSON.parse(row.temp_language_overrides) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const obj = parsed as Record<string, unknown>;
          tempLanguageOverrides = {};
          for (const [k, v] of Object.entries(obj)) {
            if (typeof k === "string" && typeof v === "string") tempLanguageOverrides[k] = v;
          }
        }
      } catch {
        // ignorar
      }
    }
    return { realTabIds: ids, activeTabId, mdViewModes, closedTabsStack, favoriteFolders, favoritesPanelExpanded, tempLanguageOverrides };
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
  const favoriteFoldersJson = JSON.stringify(session.favoriteFolders ?? []);
  const favoritesPanelExpanded = session.favoritesPanelExpanded !== false ? 1 : 0;
  const tempLanguageOverridesJson = JSON.stringify(session.tempLanguageOverrides ?? {});
  await db.execute(
    `INSERT INTO explorer_session (id, real_tab_ids, active_tab_id, md_view_modes, closed_tabs_stack, favorite_folders, favorites_panel_expanded, temp_language_overrides, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       real_tab_ids = excluded.real_tab_ids,
       active_tab_id = excluded.active_tab_id,
       md_view_modes = excluded.md_view_modes,
       closed_tabs_stack = excluded.closed_tabs_stack,
       favorite_folders = excluded.favorite_folders,
       favorites_panel_expanded = excluded.favorites_panel_expanded,
       temp_language_overrides = excluded.temp_language_overrides,
       updated_at = excluded.updated_at`,
    [ROW_ID, realTabIdsJson, activeTabId, mdViewModesJson, closedTabsStackJson, favoriteFoldersJson, favoritesPanelExpanded, tempLanguageOverridesJson]
  );
}
