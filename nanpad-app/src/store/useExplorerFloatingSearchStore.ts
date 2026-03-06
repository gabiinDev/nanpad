/**
 * useExplorerFloatingSearchStore — estado del buscador flotante del explorador (Ctrl+B).
 * Buscar en contenido de tabs abiertos y comparar archivos.
 */

import { create } from "zustand";

interface ExplorerFloatingSearchStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useExplorerFloatingSearchStore = create<ExplorerFloatingSearchStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
