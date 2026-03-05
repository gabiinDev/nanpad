/**
 * API pública del módulo Document.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 */

// ─── UseCases ────────────────────────────────────────────────────────────────
export { CreateDocument } from "./usecases/CreateDocument.ts";
export { UpdateDocument } from "./usecases/UpdateDocument.ts";
export { GetDocument } from "./usecases/GetDocument.ts";
export { ListDocuments } from "./usecases/ListDocuments.ts";
export { DeleteDocument } from "./usecases/DeleteDocument.ts";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export type {
  DocumentDTO,
  DocumentWithContentDTO,
  CreateDocumentInput,
  UpdateDocumentInput,
  GetDocumentInput,
  ListDocumentsInput,
} from "./dtos/DocumentDTO.ts";

// ─── Contrato del repositorio ─────────────────────────────────────────────────
export type { IDocumentRepository } from "../infrastructure/persistence/DocumentRepository.ts";

// ─── Implementación SQLite (solo para el Composition Root) ───────────────────
export { DocumentSqliteRepository } from "../infrastructure/persistence/sqlite/DocumentSqliteRepository.ts";
