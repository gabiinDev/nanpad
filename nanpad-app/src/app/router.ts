/**
 * Router minimalista de NANPAD.
 * Gestiona la vista activa sin dependencias externas.
 * Las rutas se representan como un tipo union; no hay URL real (app desktop).
 */

export type AppRoute = "home" | "tasks" | "documents" | "settings";

export const DEFAULT_ROUTE: AppRoute = "home";
