/**
 * useSearchFocusStore — registro de callbacks para enfocar las barras de búsqueda.
 * Permite que Shell dispare Ctrl+U y enfoque el buscador de Tareas o del Explorador
 * según la ruta actual.
 */

import { create } from "zustand";

type FocusFn = () => void;

interface SearchFocusStore {
  focusTasksSearch: FocusFn | null;
  focusExplorerSearch: FocusFn | null;
  setFocusTasksSearch: (fn: FocusFn | null) => void;
  setFocusExplorerSearch: (fn: FocusFn | null) => void;
}

export const useSearchFocusStore = create<SearchFocusStore>((set) => ({
  focusTasksSearch: null,
  focusExplorerSearch: null,
  setFocusTasksSearch: (fn) => set({ focusTasksSearch: fn }),
  setFocusExplorerSearch: (fn) => set({ focusExplorerSearch: fn }),
}));
