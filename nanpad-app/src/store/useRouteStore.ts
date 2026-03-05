/**
 * Store de ruta actual para navegación desde cualquier componente
 * (p. ej. HomePage que navega a tasks o documents).
 */

import { create } from "zustand";
import type { AppRoute } from "@app/router.ts";
import { DEFAULT_ROUTE } from "@app/router.ts";

interface RouteStore {
  route: AppRoute;
  setRoute: (route: AppRoute) => void;
}

export const useRouteStore = create<RouteStore>((set) => ({
  route: DEFAULT_ROUTE,
  setRoute: (route) => set({ route }),
}));
