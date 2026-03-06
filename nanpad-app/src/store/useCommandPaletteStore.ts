/**
 * useCommandPaletteStore — estado de apertura de la command palette (Ctrl+K).
 * Incluye callback opcional para "Nueva tarea" registrado por TasksPage.
 */

import { create } from "zustand";

interface CommandPaletteStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Llamado al elegir "Nueva tarea" en la palette; lo registra TasksPage. */
  onOpenNewTask: (() => void) | null;
  setOnOpenNewTask: (fn: (() => void) | null) => void;
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  onOpenNewTask: null,
  setOnOpenNewTask: (fn) => set({ onOpenNewTask: fn }),
}));
