/**
 * Store mínimo para "foco" al navegar desde Home.
 * Al hacer click en una tarea en Home → ir a Tareas y hacer scroll a esa tarea.
 * El foco se consume en TasksPage y se limpia.
 */

import { create } from "zustand";

interface NavFocusStore {
  /** ID de tarea a la que hacer scroll al estar en la página de tareas. */
  focusTaskId: string | null;
  setFocusTaskId: (id: string | null) => void;
}

export const useNavFocusStore = create<NavFocusStore>((set) => ({
  focusTaskId: null,
  setFocusTaskId: (id) => set({ focusTaskId: id }),
}));
