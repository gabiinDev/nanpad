/**
 * Implementación del repositorio de documentos sobre IDatabase.
 * El contenido se almacena en `document_content` (tabla separada).
 * No importa nada de Tauri — recibe IDatabase por inyección.
 */

import type { IDatabase } from "@infra/db/IDatabase.ts";
import type { IDocumentRepository, DocumentFilters } from "../DocumentRepository.ts";
import { Document } from "../../../domain/entities/Document.ts";
import type { DocumentRow, DocumentContentRow } from "@infra/db/schema.ts";
import type { EntityId } from "@shared/types/id.ts";

/**
 * Repositorio de documentos que opera sobre cualquier implementación de IDatabase.
 * Recibe la instancia por inyección desde el Composition Root.
 */
export class DocumentSqliteRepository implements IDocumentRepository {
  constructor(private readonly db: IDatabase) {}

  async save(doc: Document): Promise<void> {
    const existing = await this.db.select<DocumentRow[]>(
      "SELECT id FROM documents WHERE id = $1",
      [doc.id]
    );

    if (existing.length === 0) {
      await this.db.execute(
        `INSERT INTO documents (id, title, content_hash, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          doc.id,
          doc.title,
          doc.contentHash,
          doc.createdAt.toISOString(),
          doc.updatedAt.toISOString(),
        ]
      );

      await this.db.execute(
        `INSERT INTO document_content (document_id, content, updated_at)
         VALUES ($1,$2,$3)`,
        [doc.id, doc.content ?? "", doc.updatedAt.toISOString()]
      );
    } else {
      await this.db.execute(
        `UPDATE documents SET title=$1, content_hash=$2, updated_at=$3
         WHERE id=$4`,
        [doc.title, doc.contentHash, doc.updatedAt.toISOString(), doc.id]
      );

      if (doc.content !== null) {
        await this.db.execute(
          `INSERT INTO document_content (document_id, content, updated_at)
           VALUES ($1,$2,$3)
           ON CONFLICT(document_id) DO UPDATE
             SET content=$2, updated_at=$3`,
          [doc.id, doc.content, doc.updatedAt.toISOString()]
        );
      }
    }
  }

  async findById(id: EntityId): Promise<Document | null> {
    const rows = await this.db.select<DocumentRow[]>(
      "SELECT * FROM documents WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return null;

    const contentRows = await this.db.select<DocumentContentRow[]>(
      "SELECT content FROM document_content WHERE document_id = $1",
      [id]
    );

    const content = contentRows.length > 0 ? contentRows[0].content : "";

    return Document.reconstitute({
      id: rows[0].id,
      title: rows[0].title,
      contentHash: rows[0].content_hash,
      content,
      createdAt: new Date(rows[0].created_at),
      updatedAt: new Date(rows[0].updated_at),
    });
  }

  async findAll(filters?: DocumentFilters): Promise<Document[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters?.text) {
      conditions.push(`title LIKE $${paramIdx}`);
      // eslint-disable-next-line no-useless-assignment -- paramIdx se usa en siguientes condiciones y en la query
      paramIdx += 1;
      params.push(`%${filters.text}%`);
    }

    let sql = "SELECT * FROM documents";
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY updated_at DESC";

    const rows = await this.db.select<DocumentRow[]>(sql, params);

    return rows.map((row) =>
      Document.reconstitute({
        id: row.id,
        title: row.title,
        contentHash: row.content_hash,
        content: null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      })
    );
  }

  async delete(id: EntityId): Promise<void> {
    // document_content se elimina en cascada (ON DELETE CASCADE en el esquema)
    await this.db.execute("DELETE FROM documents WHERE id = $1", [id]);
  }
}
