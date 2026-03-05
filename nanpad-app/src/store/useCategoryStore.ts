/**
 * Store de categorías con Zustand.
 * Se carga una vez al montar la app y se usa en formularios de tarea.
 */

import { create } from "zustand";
import type { CategoryDTO } from "@nanpad/core";
import type { AppUseCases } from "@app/composition.ts";

interface CategoryStore {
  categories: CategoryDTO[];
  loading: boolean;

  loadCategories: (uc: AppUseCases) => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [],
  loading: false,

  loadCategories: async (uc) => {
    set({ loading: true });
    try {
      const categories = await uc.listCategories.execute({});
      set({ categories, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
