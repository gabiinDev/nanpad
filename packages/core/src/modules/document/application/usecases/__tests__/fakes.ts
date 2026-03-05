/**
 * Fakes para tests del módulo Document.
 */

import type {
  IDocumentRepository,
  DocumentFilters,
} from "../../../infrastructure/persistence/DocumentRepository.ts";
import type { Document } from "../../../domain/entities/Document.ts";
import type { EntityId } from "@shared/types/id.ts";

/** Repositorio de documentos en memoria para tests. */
export class InMemoryDocumentRepository implements IDocumentRepository {
  private docs = new Map<string, Document>();

  async save(doc: Document): Promise<void> {
    this.docs.set(doc.id, doc);
  }

  async findById(id: EntityId): Promise<Document | null> {
    return this.docs.get(id) ?? null;
  }

  async findAll(filters?: DocumentFilters): Promise<Document[]> {
    let results = [...this.docs.values()];

    if (filters?.text) {
      const text = filters.text.toLowerCase();
      results = results.filter((d) => d.title.toLowerCase().includes(text));
    }

    return results.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async delete(id: EntityId): Promise<void> {
    this.docs.delete(id);
  }

  /** Utilidad de test: obtener todos los documentos. */
  getAll(): Document[] {
    return [...this.docs.values()];
  }
}
