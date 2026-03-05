/**
 * Store de documentos con Zustand.
 * Mantiene la lista y el documento actualmente abierto en el editor.
 */

import { create } from "zustand";
import type { DocumentDTO, DocumentWithContentDTO } from "@nanpad/core";
import type { AppUseCases } from "@app/composition.ts";

interface DocumentStore {
  documents: DocumentDTO[];
  activeDocument: DocumentWithContentDTO | null;
  loading: boolean;
  saving: boolean;

  loadDocuments: (uc: AppUseCases) => Promise<void>;
  openDocument: (uc: AppUseCases, id: string) => Promise<void>;
  createDocument: (uc: AppUseCases, title: string, content?: string) => Promise<DocumentDTO>;
  saveDocument: (uc: AppUseCases, id: string, content: string, title?: string) => Promise<void>;
  deleteDocument: (uc: AppUseCases, id: string) => Promise<void>;
  closeDocument: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  activeDocument: null,
  loading: false,
  saving: false,

  loadDocuments: async (uc) => {
    set({ loading: true });
    try {
      const documents = await uc.listDocuments.execute({});
      set({ documents, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  openDocument: async (uc, id) => {
    set({ loading: true });
    try {
      const doc = await uc.getDocument.execute({ id });
      set({ activeDocument: doc, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createDocument: async (uc, title, content = "") => {
    const doc = await uc.createDocument.execute({ title, content });
    await get().loadDocuments(uc);
    return doc;
  },

  saveDocument: async (uc, id, content, title) => {
    set({ saving: true });
    try {
      await uc.updateDocument.execute({ id, content, title });
      // Actualizar el documento activo si es el mismo
      const active = get().activeDocument;
      if (active && active.id === id) {
        set({ activeDocument: { ...active, content, ...(title ? { title } : {}) } });
      }
      await get().loadDocuments(uc);
    } finally {
      set({ saving: false });
    }
  },

  deleteDocument: async (uc, id) => {
    await uc.deleteDocument.execute(id);
    const active = get().activeDocument;
    if (active?.id === id) set({ activeDocument: null });
    await get().loadDocuments(uc);
  },

  closeDocument: () => { set({ activeDocument: null }); },
}));
